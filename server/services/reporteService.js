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
    SELECT r.folio, rd.id, r.obra_id, o.nombre as obra_nombre,
           r.proveedor, rd.producto, rd.cantidad_recibida, r.fecha,
           f.folio as factura_folio, f.monto as monto_facturado, f.status as estado_factura
    FROM recepcion_detalles rd
    JOIN recepciones r ON r.id = rd.recepcion_id
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

export const getExplosionInsumos = (obra_id, hasta) => {
  // The SELECT sums factured quantities + direct gastos linked to catalog items.
  // cant_comprada = only from invoices (unit qty); costo_real = invoices + direct gastos (financial total)
  const selectBase = `
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
      COALESCE(SUM(df.subtotal), 0) + COALESCE(SUM(g.monto), 0) as costo_real,
      CASE
        WHEN COALESCE(SUM(df.cantidad), 0) > 0
        THEN ROUND((COALESCE(SUM(df.subtotal), 0) + COALESCE(SUM(g.monto), 0)) / SUM(df.cantidad), 4)
        ELSE 0
      END as precio_real_prom,
      COALESCE(SUM(g.monto), 0) as costo_gasto_directo
    FROM catalogo_obras co
  `

  if (hasta) {
    return db.prepare(`
      ${selectBase}
      LEFT JOIN (
        SELECT df2.* FROM detalles_factura df2
        JOIN facturas f2 ON f2.id = df2.factura_id
        WHERE f2.fecha <= ?
      ) df ON df.catalogo_obra_id = co.id
      LEFT JOIN (
        SELECT * FROM gastos WHERE catalogo_obra_id IS NOT NULL AND fecha <= ?
      ) g ON g.catalogo_obra_id = co.id
      WHERE co.obra_id = ?
      GROUP BY co.id
      ORDER BY co.codigo ASC
    `).all(hasta, hasta, obra_id)
  }

  return db.prepare(`
    ${selectBase}
    LEFT JOIN detalles_factura df ON df.catalogo_obra_id = co.id
    LEFT JOIN gastos g ON g.catalogo_obra_id = co.id
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
      COALESCE((SELECT SUM(f2.monto) FROM facturas f2 WHERE f2.obra_id = o.id), 0) as total_facturado,
      COALESCE((SELECT SUM(g2.monto) FROM gastos g2 WHERE g2.obra_id = o.id), 0) as gastos_directos
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

export const getAvancesObrasDetallado = () => {
  return db.prepare(`
    SELECT
      o.id as obra_id,
      o.nombre,
      o.estado,
      COALESCE(SUM(co.cantidad_presupuestada * co.precio_referencia), 0) as presupuesto_total,
      COALESCE((SELECT SUM(f2.monto) FROM facturas f2 WHERE f2.obra_id = o.id), 0) as total_facturado,
      COALESCE((SELECT SUM(g2.monto) FROM gastos g2 WHERE g2.obra_id = o.id), 0) as gastos_directos,
      COALESCE((SELECT SUM(f2.monto) FROM facturas f2 WHERE f2.obra_id = o.id AND f2.status = 'Pendiente'), 0) as pendiente_pagar
    FROM obras o
    LEFT JOIN catalogo_obras co ON co.obra_id = o.id
    GROUP BY o.id
    ORDER BY o.nombre ASC
  `).all()
}

export const getGastosDirectosObra = (obra_id) => {
  return db.prepare(`
    SELECT categoria, concepto, SUM(monto) as total, COUNT(*) as cantidad
    FROM gastos WHERE obra_id = ?
    GROUP BY categoria, concepto
    ORDER BY total DESC
  `).all(obra_id)
}

export const getFlujoCaja = () => {
  const facturasPorObra = db.prepare(`
    SELECT f.obra_id, o.nombre as obra_nombre,
           COUNT(*) as cantidad,
           ROUND(SUM(f.monto), 2) as total
    FROM facturas f
    JOIN obras o ON o.id = f.obra_id
    WHERE f.status = 'Pendiente'
    GROUP BY f.obra_id
    ORDER BY total DESC
  `).all()

  const cuentas = db.prepare(`
    SELECT id, nombre, tipo, banco, saldo_actual
    FROM cuentas_bancarias
    ORDER BY tipo, nombre
  `).all()

  const total_pendiente = facturasPorObra.reduce((s, f) => s + f.total, 0)
  const saldo_fiscal    = cuentas.filter(c => c.tipo === 'Fiscal').reduce((s, c) => s + c.saldo_actual, 0)
  const saldo_caja      = cuentas.filter(c => c.tipo === 'Caja Chica').reduce((s, c) => s + c.saldo_actual, 0)
  const deuda_credito   = cuentas.filter(c => c.tipo === 'Crédito').reduce((s, c) => s + Math.abs(c.saldo_actual), 0)

  return {
    facturas_por_obra: facturasPorObra,
    total_pendiente,
    cuentas,
    saldo_fiscal,
    saldo_caja,
    deuda_credito,
    liquidez_neta: saldo_fiscal + saldo_caja - total_pendiente
  }
}

export const getGastoMensual = (obra_id) => {
  let sql = `
    SELECT
      strftime('%Y-%m', f.fecha) as mes,
      o.id as obra_id,
      o.nombre as obra_nombre,
      ROUND(SUM(df.subtotal), 2) as total_facturado
    FROM detalles_factura df
    JOIN facturas f ON f.id = df.factura_id
    JOIN obras o ON o.id = f.obra_id
  `
  const params = []
  if (obra_id) { sql += ' WHERE o.id = ?'; params.push(obra_id) }
  sql += ' GROUP BY mes, o.id ORDER BY mes ASC, o.nombre ASC'
  return db.prepare(sql).all(...params)
}

export const getRankingProveedores = (obra_id) => {
  let sql = `
    SELECT
      f.proveedor,
      COUNT(DISTINCT f.id) as num_facturas,
      COUNT(DISTINCT f.obra_id) as num_obras,
      ROUND(SUM(f.monto), 2) as total_facturado,
      ROUND(SUM(CASE WHEN f.status = 'Pagada'    THEN f.monto ELSE 0 END), 2) as total_pagado,
      ROUND(SUM(CASE WHEN f.status = 'Pendiente' THEN f.monto ELSE 0 END), 2) as total_pendiente
    FROM facturas f
  `
  const params = []
  if (obra_id) { sql += ' WHERE f.obra_id = ?'; params.push(obra_id) }
  sql += ' GROUP BY f.proveedor ORDER BY total_facturado DESC'
  return db.prepare(sql).all(...params)
}

export const getHistorialPreciosObra = (obra_id) => {
  if (!obra_id) throw new Error('Se requiere el ID de la obra')

  const insumos = db.prepare(`
    SELECT
      co.id            as catalogo_id,
      co.codigo,
      co.nombre,
      co.unidad,
      co.precio_referencia,
      co.cantidad_presupuestada,
      COUNT(df.id)                                                 as num_compras,
      COALESCE(SUM(df.cantidad), 0)                                as cant_comprada,
      COALESCE(SUM(df.subtotal), 0)                                as costo_total,
      MIN(df.precio_unitario)                                      as precio_min,
      MAX(df.precio_unitario)                                      as precio_max,
      CASE WHEN SUM(df.cantidad) > 0
           THEN SUM(df.subtotal) / SUM(df.cantidad)
           ELSE NULL END                                           as precio_prom
    FROM catalogo_obras co
    LEFT JOIN detalles_factura df ON df.catalogo_obra_id = co.id
    LEFT JOIN facturas f          ON f.id = df.factura_id
    WHERE co.obra_id = ?
    GROUP BY co.id
    ORDER BY co.codigo ASC
  `).all(obra_id)

  const ultimoStmt = db.prepare(`
    SELECT df.precio_unitario, f.fecha, f.proveedor
    FROM detalles_factura df
    JOIN facturas f ON f.id = df.factura_id
    WHERE df.catalogo_obra_id = ?
    ORDER BY f.fecha DESC, f.id DESC
    LIMIT 1
  `)

  const sparkStmt = db.prepare(`
    SELECT f.fecha, df.precio_unitario
    FROM detalles_factura df
    JOIN facturas f ON f.id = df.factura_id
    WHERE df.catalogo_obra_id = ?
    ORDER BY f.fecha ASC, f.id ASC
  `)

  return insumos.map(i => {
    const ult = ultimoStmt.get(i.catalogo_id)
    const spark = sparkStmt.all(i.catalogo_id)
    const precio_ref = i.precio_referencia || 0
    const cant_pres = i.cantidad_presupuestada || 0
    const precio_prom = i.precio_prom || 0
    const cant_comprada = i.cant_comprada || 0

    // Atribución de discrepancia: ¿el sobre/sub-costo viene del PRECIO o de la CANTIDAD?
    const impacto_precio    = (precio_prom - precio_ref) * cant_comprada
    const impacto_cantidad  = (cant_comprada - cant_pres) * precio_ref
    const variacion_pct     = precio_ref > 0 ? ((precio_prom - precio_ref) / precio_ref) * 100 : 0

    return {
      ...i,
      ultimo_precio:     ult?.precio_unitario ?? null,
      ultima_fecha:      ult?.fecha           ?? null,
      ultimo_proveedor:  ult?.proveedor       ?? null,
      impacto_precio,
      impacto_cantidad,
      variacion_pct,
      sparkline: spark
    }
  })
}

export const getHistorialPreciosInsumo = (obra_id, catalogo_id) => {
  const insumo = db.prepare(`
    SELECT * FROM catalogo_obras WHERE id = ? AND obra_id = ?
  `).get(catalogo_id, obra_id)
  if (!insumo) throw new Error('Insumo no encontrado en esta obra')

  const compras = db.prepare(`
    SELECT
      df.id            as detalle_id,
      f.id             as factura_id,
      f.folio,
      f.folio_proveedor,
      f.proveedor,
      f.fecha,
      df.cantidad,
      df.precio_unitario,
      df.subtotal
    FROM detalles_factura df
    JOIN facturas f ON f.id = df.factura_id
    WHERE df.catalogo_obra_id = ? AND f.obra_id = ?
    ORDER BY f.fecha ASC, f.id ASC
  `).all(catalogo_id, obra_id)

  const proveedores = db.prepare(`
    SELECT
      f.proveedor,
      COUNT(df.id)                                  as num_compras,
      SUM(df.cantidad)                              as cant_total,
      SUM(df.subtotal)                              as costo_total,
      MIN(df.precio_unitario)                       as precio_min,
      MAX(df.precio_unitario)                       as precio_max,
      CASE WHEN SUM(df.cantidad) > 0
           THEN SUM(df.subtotal)/SUM(df.cantidad)
           ELSE 0 END                               as precio_prom
    FROM detalles_factura df
    JOIN facturas f ON f.id = df.factura_id
    WHERE df.catalogo_obra_id = ? AND f.obra_id = ?
    GROUP BY f.proveedor
    ORDER BY costo_total DESC
  `).all(catalogo_id, obra_id)

  const cant_comprada = compras.reduce((s, c) => s + c.cantidad, 0)
  const costo_total   = compras.reduce((s, c) => s + c.subtotal, 0)
  const precio_prom   = cant_comprada > 0 ? costo_total / cant_comprada : 0
  const precio_min    = compras.length ? Math.min(...compras.map(c => c.precio_unitario)) : 0
  const precio_max    = compras.length ? Math.max(...compras.map(c => c.precio_unitario)) : 0
  const ultimo        = compras[compras.length - 1] || null
  const primero       = compras[0] || null
  const variacion_total_pct = primero && primero.precio_unitario > 0
    ? ((ultimo.precio_unitario - primero.precio_unitario) / primero.precio_unitario) * 100
    : 0

  const precio_ref = insumo.precio_referencia || 0
  const cant_pres  = insumo.cantidad_presupuestada || 0
  const impacto_precio   = (precio_prom - precio_ref) * cant_comprada
  const impacto_cantidad = (cant_comprada - cant_pres) * precio_ref
  const sobrecosto_total = costo_total - (cant_pres * precio_ref)

  return {
    insumo,
    compras,
    proveedores,
    kpis: {
      num_compras: compras.length,
      cant_comprada,
      costo_total,
      precio_min,
      precio_max,
      precio_prom,
      ultimo_precio: ultimo?.precio_unitario ?? null,
      ultima_fecha:  ultimo?.fecha ?? null,
      variacion_total_pct,
      variacion_vs_ref_pct: precio_ref > 0 ? ((precio_prom - precio_ref) / precio_ref) * 100 : 0,
      impacto_precio,
      impacto_cantidad,
      sobrecosto_total
    }
  }
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
