import db from '../db.js'

const generarFolioInterno = () => {
  const year = new Date().getFullYear()
  const row = db.prepare(`
    SELECT MAX(CAST(SUBSTR(folio_interno, -4) AS INTEGER)) as max_n
    FROM facturas WHERE folio_interno LIKE 'FAC-${year}-%'
  `).get()
  const n = (row?.max_n || 0) + 1
  return `FAC-${year}-${String(n).padStart(4, '0')}`
}

export const registrarNuevaFactura = (datos) => {
  return db.transaction(() => {
    const folio_interno = generarFolioInterno()
    const fechaFinal = datos.fecha || new Date().toISOString().split('T')[0]

    // Insertar factura
    const info = db.prepare(`
      INSERT INTO facturas (folio, folio_proveedor, obra_id, recepcion_id, proveedor, monto, fecha)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      folio_interno,
      datos.folio_proveedor || '',
      datos.obra_id,
      datos.recepcion_id || null,
      datos.proveedor || '',
      datos.monto || 0,
      fechaFinal
    )

    const facturaId = info.lastInsertRowid

    // Insertar detalles e historial de precios si existen
    if (datos.detalles && datos.detalles.length > 0) {
      const stmtDetalle = db.prepare(`
        INSERT INTO detalles_factura (factura_id, catalogo_obra_id, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `)
      const stmtHistorial = db.prepare(`
        INSERT INTO historial_precios (catalogo_obra_id, precio, fecha, factura_id)
        VALUES (?, ?, ?, ?)
      `)
      
      for (const d of datos.detalles) {
        stmtDetalle.run(facturaId, d.catalogo_obra_id, d.cantidad, d.precio_unitario, d.subtotal)
        stmtHistorial.run(d.catalogo_obra_id, d.precio_unitario, fechaFinal, facturaId)
      }
    }

    return db.prepare('SELECT * FROM facturas WHERE id = ?').get(facturaId)
  })()
}

export const getFacturas = (filtros = {}) => {
  let sql = `
    SELECT f.*, o.nombre as obra_nombre
    FROM facturas f
    LEFT JOIN obras o ON o.id = f.obra_id
    WHERE 1=1
  `
  const params = []
  if (filtros.obra_id) { sql += ' AND f.obra_id = ?'; params.push(filtros.obra_id) }
  if (filtros.status)  { sql += ' AND f.status = ?';  params.push(filtros.status)  }
  sql += ' ORDER BY f.id DESC'
  return db.prepare(sql).all(...params)
}
