import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Genera folio automático REC-NNN
function siguienteFolio() {
  const row = db.prepare(`
    SELECT MAX(CAST(REPLACE(folio,'REC-','') AS INTEGER)) as max_n FROM recepciones
  `).get()
  const n = (row.max_n || 0) + 1
  return `REC-${String(n).padStart(3, '0')}`
}

// GET /api/recepciones — listar (filtrable ?obra_id=1)
router.get('/', (req, res) => {
  const { obra_id } = req.query
  let sql = `
    SELECT r.*, o.nombre as obra_nombre, p.folio as pedido_folio
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    LEFT JOIN pedidos p ON p.id = r.pedido_id
    WHERE 1=1
  `
  const params = []
  if (obra_id) { sql += ' AND r.obra_id = ?'; params.push(obra_id) }
  sql += ' ORDER BY r.id DESC'

  res.json(db.prepare(sql).all(...params))
})

// GET /api/recepciones/pendientes — recepciones sin factura aún
router.get('/pendientes', (_req, res) => {
  const rows = db.prepare(`
    SELECT r.*, o.nombre as obra_nombre
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    WHERE r.id NOT IN (SELECT recepcion_id FROM facturas WHERE recepcion_id IS NOT NULL)
    ORDER BY r.fecha DESC
  `).all()
  res.json(rows)
})

// POST /api/recepciones — registrar recepción
// Lógica: si viene con pedido_id, calcula faltante automáticamente
router.post('/', (req, res) => {
  const {
    obra_id, pedido_id = null, tipo_flujo = 'sin_pedido',
    proveedor = '', producto = '', cantidad_recibida,
    entrego = '', recibio = '', fecha
  } = req.body

  if (!obra_id || cantidad_recibida == null) {
    return res.status(400).json({ error: 'obra_id y cantidad_recibida son requeridos' })
  }

  let cantidad_pedida = 0
  let faltante = 0

  // Si viene con pedido, tomamos la cantidad pedida desde BD
  if (pedido_id) {
    const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedido_id)
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })
    cantidad_pedida = pedido.cantidad
    faltante        = Math.max(0, cantidad_pedida - cantidad_recibida)

    // Actualizamos el pedido a Recibido (o Parcial si faltó algo)
    const nuevoStatus = faltante > 0 ? 'Parcial' : 'Recibido'
    db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(nuevoStatus, pedido_id)
  }

  const folio      = siguienteFolio()
  const fechaFinal = fecha || new Date().toISOString().split('T')[0]

  const info = db.prepare(`
    INSERT INTO recepciones
      (folio, obra_id, pedido_id, tipo_flujo, proveedor, producto,
       cantidad_pedida, cantidad_recibida, faltante, entrego, recibio, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(folio, obra_id, pedido_id, tipo_flujo, proveedor, producto,
         cantidad_pedida, cantidad_recibida, faltante, entrego, recibio, fechaFinal)

  res.status(201).json(db.prepare('SELECT * FROM recepciones WHERE id = ?').get(info.lastInsertRowid))
})

export default router
