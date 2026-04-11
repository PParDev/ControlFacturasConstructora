import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET /api/reportes/obra/:id — resumen de gastos por obra
router.get('/obra/:id', (req, res) => {
  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(req.params.id)
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' })

  const por_categoria = db.prepare(`
    SELECT categoria, SUM(monto) as total, COUNT(*) as cantidad
    FROM gastos WHERE obra_id = ?
    GROUP BY categoria
  `).all(obra.id)

  const facturas       = db.prepare("SELECT * FROM facturas WHERE obra_id = ?").all(obra.id)
  const total_facturado = facturas.reduce((s, f) => s + f.monto, 0)
  const total_pagado    = facturas.filter(f => f.status === 'Pagada').reduce((s, f) => s + f.monto, 0)
  const por_pagar       = total_facturado - total_pagado

  res.json({
    obra,
    por_categoria,
    total_gastos_directos: obra.gasto_acumulado,
    facturas: {
      total: facturas.length,
      total_facturado,
      total_pagado,
      por_pagar,
    }
  })
})

// GET /api/reportes/facturas-pendientes — total por pagar global
router.get('/facturas-pendientes', (_req, res) => {
  const rows = db.prepare(`
    SELECT f.*, o.nombre as obra_nombre
    FROM facturas f
    LEFT JOIN obras o ON o.id = f.obra_id
    WHERE f.status = 'Pendiente'
    ORDER BY f.fecha ASC
  `).all()
  const total = rows.reduce((s, r) => s + r.monto, 0)
  res.json({ total, cantidad: rows.length, facturas: rows })
})

// GET /api/reportes/recibido-vs-facturado — comparación recepciones vs facturas
router.get('/recibido-vs-facturado', (_req, res) => {
  const recepciones = db.prepare(`
    SELECT r.id, r.folio, r.obra_id, o.nombre as obra_nombre,
           r.proveedor, r.producto, r.cantidad_recibida, r.fecha,
           f.folio as factura_folio, f.monto as monto_facturado, f.status as estado_factura
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    LEFT JOIN facturas f ON f.recepcion_id = r.id
    ORDER BY r.fecha DESC
  `).all()
  res.json(recepciones)
})

// GET /api/reportes/estado-cuenta — estado cheques filtrable ?desde=2026-01-01&hasta=2026-12-31
router.get('/estado-cuenta', (req, res) => {
  const { cuenta = 'cheques', desde, hasta } = req.query
  const tabla = cuenta === 'credito' ? 'mov_credito' : 'mov_cheques'
  let sql = `SELECT m.*, o.nombre as obra_nombre FROM ${tabla} m LEFT JOIN obras o ON o.id = m.obra_id WHERE 1=1`
  const params = []
  if (desde) { sql += ' AND m.fecha >= ?'; params.push(desde) }
  if (hasta) { sql += ' AND m.fecha <= ?'; params.push(hasta)  }
  sql += ' ORDER BY m.id ASC'

  res.json(db.prepare(sql).all(...params))
})

export default router
