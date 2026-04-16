import { Router } from 'express'
import db from '../db.js'
import { crearFactura } from '../controllers/facturaController.js' // Importamos tu nuevo controlador

const router = Router()

// Mantenemos tus consultas GET exactamente igual por ahora
router.get('/', (req, res) => {
  const { obra_id, status } = req.query
  let sql = `
    SELECT f.*, o.nombre as obra_nombre
    FROM facturas f
    LEFT JOIN obras o ON o.id = f.obra_id
    WHERE 1=1
  `
  const params = []
  if (obra_id) { sql += ' AND f.obra_id = ?'; params.push(obra_id) }
  if (status)  { sql += ' AND f.status = ?';  params.push(status)  }
  sql += ' ORDER BY f.id DESC'

  res.json(db.prepare(sql).all(...params))
})

router.get('/pendientes', (_req, res) => {
  const rows = db.prepare(`
    SELECT f.*, o.nombre as obra_nombre
    FROM facturas f
    LEFT JOIN obras o ON o.id = f.obra_id
    WHERE f.status = 'Pendiente'
    ORDER BY f.fecha ASC
  `).all()
  res.json(rows)
})

// === MIRA QUÉ LIMPIA QUEDÓ LA RUTA POST ===
router.post('/', crearFactura)

export default router
