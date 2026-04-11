import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET /api/dashboard — métricas aggregadas
router.get('/', (_req, res) => {
  const obras_activas = db.prepare(
    "SELECT COUNT(*) as n FROM obras WHERE status = 'Activa'"
  ).get().n

  const facturas_pendientes = db.prepare(
    "SELECT COUNT(*) as n, SUM(monto) as total FROM facturas WHERE status = 'Pendiente'"
  ).get()

  // Gasto del mes actual
  const mesActual = new Date().toISOString().slice(0, 7) // "2026-04"
  const gasto_mes = db.prepare(
    "SELECT COALESCE(SUM(monto),0) as total FROM gastos WHERE fecha LIKE ?"
  ).get(`${mesActual}%`).total

  const cheque  = db.prepare('SELECT saldo FROM mov_cheques ORDER BY id DESC LIMIT 1').get()
  const credito = db.prepare('SELECT saldo FROM mov_credito ORDER BY id DESC LIMIT 1').get()

  res.json({
    obras_activas,
    facturas_pendientes_count: facturas_pendientes.n,
    facturas_pendientes_total: facturas_pendientes.total || 0,
    gasto_mes,
    saldo_cheques:  cheque  ? cheque.saldo  : 0,
    deuda_credito:  credito ? credito.saldo : 0,
  })
})

export default router
