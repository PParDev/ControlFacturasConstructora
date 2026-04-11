import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Genera folio automático OC-NNN
function siguienteFolio() {
  const row = db.prepare(`
    SELECT MAX(CAST(REPLACE(folio,'OC-','') AS INTEGER)) as max_n FROM pedidos
  `).get()
  const n = (row.max_n || 0) + 1
  return `OC-${String(n).padStart(3, '0')}`
}

// GET /api/pedidos — listar pedidos (filtrable ?obra_id=1&status=Pendiente)
router.get('/', (req, res) => {
  const { obra_id, status } = req.query
  let sql = `
    SELECT p.*, o.nombre as obra_nombre
    FROM pedidos p
    LEFT JOIN obras o ON o.id = p.obra_id
    WHERE 1=1
  `
  const params = []
  if (obra_id) { sql += ' AND p.obra_id = ?'; params.push(obra_id) }
  if (status)  { sql += ' AND p.status = ?';  params.push(status)  }
  sql += ' ORDER BY p.id DESC'

  res.json(db.prepare(sql).all(...params))
})

// POST /api/pedidos — crear pedido → genera folio
router.post('/', (req, res) => {
  const { obra_id, proveedor = '', producto = '', cantidad, unidad = '', notas = '', fecha } = req.body
  if (!obra_id || !cantidad) return res.status(400).json({ error: 'obra_id y cantidad son requeridos' })

  const obra = db.prepare('SELECT id FROM obras WHERE id = ?').get(obra_id)
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' })

  const folio = siguienteFolio()
  const fechaFinal = fecha || new Date().toISOString().split('T')[0]

  const info = db.prepare(`
    INSERT INTO pedidos (folio, obra_id, proveedor, producto, cantidad, unidad, notas, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(folio, obra_id, proveedor, producto, cantidad, unidad, notas, fechaFinal)

  res.status(201).json(db.prepare('SELECT * FROM pedidos WHERE id = ?').get(info.lastInsertRowid))
})

// PUT /api/pedidos/:id — actualizar status o datos
router.put('/:id', (req, res) => {
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id)
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })

  const { status, proveedor, producto, cantidad, notas } = req.body
  db.prepare(`
    UPDATE pedidos SET
      status    = COALESCE(?, status),
      proveedor = COALESCE(?, proveedor),
      producto  = COALESCE(?, producto),
      cantidad  = COALESCE(?, cantidad),
      notas     = COALESCE(?, notas)
    WHERE id = ?
  `).run(status, proveedor, producto, cantidad, notas, req.params.id)

  res.json(db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id))
})

export default router
