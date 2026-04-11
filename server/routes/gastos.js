import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET /api/gastos — listar gastos (filtrable ?obra_id=1&categoria=Material)
router.get('/', (req, res) => {
  const { obra_id, categoria } = req.query
  let sql = `
    SELECT g.*, o.nombre as obra_nombre
    FROM gastos g
    LEFT JOIN obras o ON o.id = g.obra_id
    WHERE 1=1
  `
  const params = []
  if (obra_id)   { sql += ' AND g.obra_id = ?';   params.push(obra_id)   }
  if (categoria) { sql += ' AND g.categoria = ?'; params.push(categoria) }
  sql += ' ORDER BY g.fecha DESC, g.id DESC'

  res.json(db.prepare(sql).all(...params))
})

// POST /api/gastos — registrar gasto → suma al gasto_acumulado de la obra
router.post('/', (req, res) => {
  const { obra_id, categoria = 'Caja chica', concepto = '', monto, fecha } = req.body
  if (!obra_id || !monto) return res.status(400).json({ error: 'obra_id y monto son requeridos' })

  const obra = db.prepare('SELECT id FROM obras WHERE id = ?').get(obra_id)
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' })

  const fechaFinal = fecha || new Date().toISOString().split('T')[0]

  const gasto = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO gastos (obra_id, categoria, concepto, monto, fecha)
      VALUES (?, ?, ?, ?, ?)
    `).run(obra_id, categoria, concepto, monto, fechaFinal)

    // Acumula en la obra
    db.prepare('UPDATE obras SET gasto_acumulado = gasto_acumulado + ? WHERE id = ?').run(monto, obra_id)

    return db.prepare('SELECT * FROM gastos WHERE id = ?').get(info.lastInsertRowid)
  })()

  res.status(201).json(gasto)
})

export default router
