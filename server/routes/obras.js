import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET /api/obras — lista todas las obras
router.get('/', (_req, res) => {
  const obras = db.prepare('SELECT * FROM obras ORDER BY id DESC').all()
  res.json(obras)
})

// GET /api/obras/:id — detalle de una obra con gastos desglosados
router.get('/:id', (req, res) => {
  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(req.params.id)
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' })

  const gastos      = db.prepare('SELECT * FROM gastos WHERE obra_id = ? ORDER BY fecha DESC').all(obra.id)
  const facturas    = db.prepare('SELECT * FROM facturas WHERE obra_id = ?').all(obra.id)
  const pedidos     = db.prepare('SELECT * FROM pedidos WHERE obra_id = ?').all(obra.id)
  const recepciones = db.prepare('SELECT * FROM recepciones WHERE obra_id = ?').all(obra.id)

  res.json({ ...obra, gastos, facturas, pedidos, recepciones })
})

// POST /api/obras — crear nueva obra
router.post('/', (req, res) => {
  const { nombre, cliente = '', ubicacion = '', fecha_inicio = '', fecha_cierre = '', status = 'Activa' } = req.body
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })

  const info = db.prepare(`
    INSERT INTO obras (nombre, cliente, ubicacion, fecha_inicio, fecha_cierre, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(nombre, cliente, ubicacion, fecha_inicio, fecha_cierre, status)

  const nueva = db.prepare('SELECT * FROM obras WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json(nueva)
})

// PUT /api/obras/:id — editar obra
router.put('/:id', (req, res) => {
  const { nombre, cliente, ubicacion, fecha_inicio, fecha_cierre, status } = req.body
  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(req.params.id)
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' })

  db.prepare(`
    UPDATE obras SET
      nombre       = COALESCE(?, nombre),
      cliente      = COALESCE(?, cliente),
      ubicacion    = COALESCE(?, ubicacion),
      fecha_inicio = COALESCE(?, fecha_inicio),
      fecha_cierre = COALESCE(?, fecha_cierre),
      status       = COALESCE(?, status)
    WHERE id = ?
  `).run(nombre, cliente, ubicacion, fecha_inicio, fecha_cierre, status, req.params.id)

  res.json(db.prepare('SELECT * FROM obras WHERE id = ?').get(req.params.id))
})

// DELETE /api/obras/:id — eliminar obra
router.delete('/:id', (req, res) => {
  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(req.params.id)
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' })
  db.prepare('DELETE FROM obras WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
