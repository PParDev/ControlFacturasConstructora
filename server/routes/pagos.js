import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET /api/pagos — historial completo
router.get('/', (req, res) => {
  const { obra_id } = req.query
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

  res.json(db.prepare(sql).all(...params))
})

// POST /api/pagos — registrar pago → marca factura como Pagada
router.post('/', (req, res) => {
  const { factura_id, monto, forma_pago = 'Transferencia', referencia = '', fecha } = req.body
  if (!factura_id || !monto) return res.status(400).json({ error: 'factura_id y monto son requeridos' })

  const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(factura_id)
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' })
  if (factura.status === 'Pagada') return res.status(409).json({ error: 'La factura ya está pagada' })

  const fechaFinal = fecha || new Date().toISOString().split('T')[0]

  // Inserta el pago y actualiza la factura dentro de una transacción
  const pag = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO pagos (factura_id, monto, forma_pago, referencia, fecha)
      VALUES (?, ?, ?, ?, ?)
    `).run(factura_id, monto, forma_pago, referencia, fechaFinal)

    // Marca la factura como Pagada
    db.prepare("UPDATE facturas SET status = 'Pagada' WHERE id = ?").run(factura_id)

    // Suma al gasto acumulado de la obra
    db.prepare(`
      UPDATE obras SET gasto_acumulado = gasto_acumulado + ? WHERE id = ?
    `).run(monto, factura.obra_id)

    return db.prepare('SELECT * FROM pagos WHERE id = ?').get(info.lastInsertRowid)
  })()

  res.status(201).json(pag)
})

export default router
