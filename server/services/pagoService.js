import db from '../db.js'

export const getPagos = (obra_id) => {
  let sql = `
    SELECT p.*, f.folio as factura_folio, f.proveedor, o.nombre as obra_nombre
    FROM pagos p
    JOIN facturas f ON f.id = p.factura_id
    LEFT JOIN obras o ON o.id = f.obra_id
    WHERE 1=1
  `
  const params = []
  if (obra_id) { sql += ' AND f.obra_id = ?'; params.push(obra_id) }
  sql += ' ORDER BY p.id DESC'

  return db.prepare(sql).all(...params)
}

export const createPago = (datos) => {
  const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(datos.factura_id)
  if (!factura) throw new Error('Factura no encontrada')
  if (factura.status === 'Pagada') throw new Error('La factura ya está pagada')

  const fechaFinal = datos.fecha || new Date().toISOString().split('T')[0]
  const formaStr = datos.forma_pago || datos.forma || 'Transferencia'

  const pag = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO pagos (factura_id, monto, forma_pago, referencia, fecha)
      VALUES (?, ?, ?, ?, ?)
    `).run(datos.factura_id, datos.monto, formaStr, datos.referencia || '', fechaFinal)

    // Marca la factura como Pagada
    db.prepare("UPDATE facturas SET status = 'Pagada' WHERE id = ?").run(datos.factura_id)

    // Suma al gasto acumulado de la obra
    db.prepare(`
      UPDATE obras SET gasto_acumulado = gasto_acumulado + ? WHERE id = ?
    `).run(datos.monto, factura.obra_id)

    return db.prepare('SELECT * FROM pagos WHERE id = ?').get(info.lastInsertRowid)
  })()

  return pag
}
