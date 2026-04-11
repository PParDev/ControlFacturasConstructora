import { Router } from 'express'
import db from '../db.js'

const router = Router()

// ════════════════════════════════════════════════════════════
//  CUENTA CHEQUES
// ════════════════════════════════════════════════════════════

// GET /api/cuentas/cheques — estado de cuenta
router.get('/cheques', (_req, res) => {
  const movs = db.prepare(`
    SELECT c.*, o.nombre as obra_nombre
    FROM mov_cheques c
    LEFT JOIN obras o ON o.id = c.obra_id
    ORDER BY c.id ASC
  `).all()
  res.json(movs)
})

// POST /api/cuentas/cheques — nuevo movimiento (saldo calculado en BD)
router.post('/cheques', (req, res) => {
  const { obra_id = null, fecha, beneficiario = '', cargo = 0, abono = 0 } = req.body
  if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' })
  if (!cargo && !abono) return res.status(400).json({ error: 'Se requiere Cargo o Abono' })

  const ultimo = db.prepare('SELECT saldo FROM mov_cheques ORDER BY id DESC LIMIT 1').get()
  const saldo_anterior = ultimo ? ultimo.saldo : 0
  const saldo_nuevo    = saldo_anterior - (parseFloat(cargo) || 0) + (parseFloat(abono) || 0)

  const info = db.prepare(`
    INSERT INTO mov_cheques (obra_id, fecha, beneficiario, cargo, abono, saldo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(obra_id, fecha, beneficiario, cargo, abono, saldo_nuevo)

  res.status(201).json(db.prepare('SELECT * FROM mov_cheques WHERE id = ?').get(info.lastInsertRowid))
})

// ════════════════════════════════════════════════════════════
//  TARJETA CRÉDITO
// ════════════════════════════════════════════════════════════

// GET /api/cuentas/credito — movimientos tarjeta
router.get('/credito', (_req, res) => {
  const movs = db.prepare(`
    SELECT c.*, o.nombre as obra_nombre
    FROM mov_credito c
    LEFT JOIN obras o ON o.id = c.obra_id
    ORDER BY c.id ASC
  `).all()
  res.json(movs)
})

// POST /api/cuentas/credito — nuevo movimiento tarjeta (deuda: cargo+, abono-)
router.post('/credito', (req, res) => {
  const { obra_id = null, fecha, beneficiario = '', cargo = 0, abono = 0 } = req.body
  if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' })
  if (!cargo && !abono) return res.status(400).json({ error: 'Se requiere Cargo o Abono' })

  const ultimo = db.prepare('SELECT saldo FROM mov_credito ORDER BY id DESC LIMIT 1').get()
  const saldo_anterior = ultimo ? ultimo.saldo : 0
  const saldo_nuevo    = saldo_anterior + (parseFloat(cargo) || 0) - (parseFloat(abono) || 0)

  const info = db.prepare(`
    INSERT INTO mov_credito (obra_id, fecha, beneficiario, cargo, abono, saldo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(obra_id, fecha, beneficiario, cargo, abono, saldo_nuevo)

  res.status(201).json(db.prepare('SELECT * FROM mov_credito WHERE id = ?').get(info.lastInsertRowid))
})

// ════════════════════════════════════════════════════════════
//  RESUMEN
// ════════════════════════════════════════════════════════════

// GET /api/cuentas/resumen — saldo actual cheques + deuda crédito
router.get('/resumen', (_req, res) => {
  const cheque  = db.prepare('SELECT saldo FROM mov_cheques ORDER BY id DESC LIMIT 1').get()
  const credito = db.prepare('SELECT saldo FROM mov_credito ORDER BY id DESC LIMIT 1').get()
  res.json({
    saldo_cheques:  cheque  ? cheque.saldo  : 0,
    deuda_credito:  credito ? credito.saldo : 0,
  })
})

export default router
