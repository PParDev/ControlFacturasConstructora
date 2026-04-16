import db from '../db.js'
import xlsx from 'xlsx'

export const getReporteObra = (id) => {
  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(id)
  if (!obra) throw new Error('Obra no encontrada')

  const por_categoria = db.prepare(`
    SELECT categoria, SUM(monto) as total, COUNT(*) as cantidad
    FROM gastos WHERE obra_id = ?
    GROUP BY categoria
  `).all(obra.id)

  const facturas       = db.prepare("SELECT * FROM facturas WHERE obra_id = ?").all(obra.id)
  const total_facturado = facturas.reduce((s, f) => s + f.monto, 0)
  const total_pagado    = facturas.filter(f => f.status === 'Pagada').reduce((s, f) => s + f.monto, 0)
  const por_pagar       = total_facturado - total_pagado

  return {
    obra,
    por_categoria,
    total_gastos_directos: obra.gasto_acumulado,
    facturas: {
      total: facturas.length,
      total_facturado,
      total_pagado,
      por_pagar,
    }
  }
}

export const getFacturasPendientesInfo = () => {
  const rows = db.prepare(`
    SELECT f.*, o.nombre as obra_nombre
    FROM facturas f
    LEFT JOIN obras o ON o.id = f.obra_id
    WHERE f.status = 'Pendiente'
    ORDER BY f.fecha ASC
  `).all()
  const total = rows.reduce((s, r) => s + r.monto, 0)
  return { total, cantidad: rows.length, facturas: rows }
}

export const getRecibidoVsFacturado = () => {
  return db.prepare(`
    SELECT r.id, r.folio, r.obra_id, o.nombre as obra_nombre,
           r.proveedor, r.producto, r.cantidad_recibida, r.fecha,
           f.folio as factura_folio, f.monto as monto_facturado, f.status as estado_factura
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    LEFT JOIN facturas f ON f.recepcion_id = r.id
    ORDER BY r.fecha DESC
  `).all()
}

export const getEstadoCuenta = (cuenta_id, desde, hasta) => {
  const cuenta = db.prepare('SELECT * FROM cuentas_bancarias WHERE id = ?').get(cuenta_id)
  if (!cuenta) throw new Error('Cuenta no encontrada')

  // Calcular saldo anterior (saldo_inicial + transacciones antes de 'desde')
  let saldo_anterior = cuenta.saldo_inicial

  if (desde) {
    const movimientos_previos = db.prepare(`
      SELECT SUM(CASE WHEN tipo = 'Abono' THEN monto ELSE -monto END) as neto
      FROM transacciones 
      WHERE cuenta_id = ? AND fecha < ?
    `).get(cuenta_id, desde)
    
    saldo_anterior += (movimientos_previos.neto || 0)
  }

  // Obtener transacciones en el rango
  let sql = `SELECT t.*, o.nombre as obra_nombre FROM transacciones t LEFT JOIN obras o ON o.id = t.obra_id WHERE t.cuenta_id = ?`
  const params = [cuenta_id]
  if (desde) { sql += ' AND t.fecha >= ?'; params.push(desde) }
  if (hasta) { sql += ' AND t.fecha <= ?'; params.push(hasta)  }
  sql += ' ORDER BY t.fecha ASC, t.id ASC'

  const transacciones = db.prepare(sql).all(...params)

  // Totales del periodo
  const resumen = transacciones.reduce((acc, t) => {
    if (t.tipo === 'Abono') acc.abonos += t.monto
    else acc.cargos += t.monto
    return acc
  }, { cargos: 0, abonos: 0 })

  return {
    cuenta,
    saldo_anterior,
    transacciones,
    resumen,
    saldo_final: saldo_anterior + resumen.abonos - resumen.cargos
  }
}

export const getExplosionInsumos = (obra_id) => {
  return db.prepare(`
    SELECT 
      co.id,
      co.codigo,
      co.nombre as concepto,
      co.unidad,
      co.categoria,
      co.cantidad_presupuestada as cant_presupuestada,
      co.precio_referencia as precio_estimado,
      ROUND(co.cantidad_presupuestada * co.precio_referencia, 2) as presupuesto_total,
      COALESCE(SUM(df.cantidad), 0) as cant_comprada,
      COALESCE(SUM(df.subtotal), 0) as costo_real,
      CASE 
        WHEN COALESCE(SUM(df.cantidad), 0) > 0 
        THEN ROUND(COALESCE(SUM(df.subtotal), 0) / SUM(df.cantidad), 4)
        ELSE 0 
      END as precio_real_prom
    FROM catalogo_obras co
    LEFT JOIN detalles_factura df ON df.catalogo_obra_id = co.id
    WHERE co.obra_id = ?
    GROUP BY co.id
    ORDER BY co.codigo ASC
  `).all(obra_id)
}

export const getAvancesObras = () => {
  return db.prepare(`
    SELECT 
      o.id as obra_id, o.nombre,
      COALESCE(SUM(co.cantidad_presupuestada * co.precio_referencia), 0) as presupuesto_total,
      COALESCE((
        SELECT SUM(df2.subtotal)
        FROM detalles_factura df2
        JOIN catalogo_obras co2 ON co2.id = df2.catalogo_obra_id
        WHERE co2.obra_id = o.id
      ), 0) as gasto_real
    FROM obras o
    LEFT JOIN catalogo_obras co ON co.obra_id = o.id
    GROUP BY o.id
    ORDER BY o.id
  `).all()
}


export const exportarExplosionExcel = (obra_id) => {
  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(obra_id)
  if (!obra) throw new Error('Obra no encontrada')

  const datos = db.prepare(`
    SELECT 
      co.codigo as "Código",
      co.nombre as "Concepto / Insumo",
      co.unidad as "Unidad",
      co.cantidad_presupuestada as "Cant. Presupuestada",
      co.precio_referencia as "Precio Ref. ($)",
      ROUND(co.cantidad_presupuestada * co.precio_referencia, 2) as "Total Presupuestado ($)",
      COALESCE(SUM(df.cantidad), 0) as "Cant. Comprada (Real)",
      COALESCE(SUM(df.subtotal), 0) as "Costo Real ($)",
      ROUND(COALESCE(SUM(df.cantidad), 0) - co.cantidad_presupuestada, 2) as "Diferencia Cant.",
      ROUND(COALESCE(SUM(df.subtotal), 0) - (co.cantidad_presupuestada * co.precio_referencia), 2) as "Diferencia Costo ($)"
    FROM catalogo_obras co
    LEFT JOIN detalles_factura df ON df.catalogo_obra_id = co.id
    WHERE co.obra_id = ?
    GROUP BY co.id
    ORDER BY co.codigo
  `).all(obra_id)

  const ws = xlsx.utils.json_to_sheet(datos)
  ws['!cols'] = [
    { wch: 10 }, { wch: 35 }, { wch: 10 }, { wch: 18 }, { wch: 15 },
    { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }
  ]

  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, 'Explosión de Insumos')

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return { buffer, obraNombre: obra.nombre }
}

export const getHistorialVariaciones = (obra_id) => {
  if (!obra_id) throw new Error('Se requiere el ID de la obra');
  
  const query = `
    SELECT 
      co.id as catalogo_id,
      co.codigo, 
      co.nombre as material, 
      co.unidad, 
      co.precio_referencia,
      
      MAX(df.precio_unitario) as precio_maximo,
      COALESCE(SUM(df.subtotal)/NULLIF(SUM(df.cantidad),0), 0) as precio_promedio,
      SUM(df.cantidad) as cantidad_total_comprada,
      
      -- Impacto financiero: Si pagamos más de la referencia, perdimos dinero (+), si pagamos menos, ahorramos (-)
      SUM(df.cantidad * (df.precio_unitario - co.precio_referencia)) as impacto_financiero,
      
      -- Extraemos la última fecha en que se cobró este precio pico
      (SELECT f2.fecha 
       FROM detalles_factura df2 
       JOIN facturas f2 ON f2.id = df2.factura_id 
       WHERE df2.catalogo_obra_id = co.id 
       ORDER BY df2.precio_unitario DESC, f2.fecha DESC 
       LIMIT 1) as fecha_pico,
       
      (SELECT f3.proveedor 
       FROM detalles_factura df3 
       JOIN facturas f3 ON f3.id = df3.factura_id 
       WHERE df3.catalogo_obra_id = co.id 
       ORDER BY df3.precio_unitario DESC, f3.fecha DESC 
       LIMIT 1) as proveedor_pico
      
    FROM catalogo_obras co
    JOIN detalles_factura df ON df.catalogo_obra_id = co.id
    JOIN facturas f ON f.id = df.factura_id
    WHERE co.obra_id = ? 
      AND df.precio_unitario != co.precio_referencia 
    GROUP BY co.id
    HAVING impacto_financiero != 0
    ORDER BY impacto_financiero DESC
  `;
  
  return db.prepare(query).all(obra_id);
}
