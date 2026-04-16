import db from '../db.js'

export const getDashboardMetrics = () => {
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

  // Saldos de cuentas - suma saldo_actual de cuentas de tipo Fiscal/Débito/Caja Chica
  const saldosDisponibles = db.prepare(
    "SELECT COALESCE(SUM(saldo_actual), 0) as total FROM cuentas_bancarias WHERE tipo != 'Crédito'"
  ).get()
  const deudaCredito = db.prepare(
    "SELECT COALESCE(SUM(saldo_actual), 0) as total FROM cuentas_bancarias WHERE tipo = 'Crédito'"
  ).get()

  const alertas_precio = db.prepare(`
    SELECT hp.precio as nuevo_precio, co.precio_referencia, co.nombre as material, o.nombre as obra, f.folio as factura_folio, hp.fecha
    FROM historial_precios hp
    JOIN catalogo_obras co ON hp.catalogo_obra_id = co.id
    JOIN obras o ON co.obra_id = o.id
    JOIN facturas f ON hp.factura_id = f.id
    WHERE hp.precio > co.precio_referencia
    ORDER BY hp.fecha DESC
    LIMIT 10
  `).all()

  return {
    obras_activas,
    facturas_pendientes_count: facturas_pendientes.n,
    facturas_pendientes_total: facturas_pendientes.total || 0,
    gasto_mes,
    saldo_cheques: saldosDisponibles.total,
    deuda_credito: deudaCredito.total,
    alertas_precio
  }
}
