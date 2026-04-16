import { Router } from 'express'
import { getReporteObra, getFacturasPendientes, getRecibidoVsFacturado, getEstadoCuenta, getExplosionInsumos, getAvancesObras, exportarExplosionExcel, getHistorialVariaciones } from '../controllers/reporteController.js'

const router = Router()

router.get('/obra/:id', getReporteObra)
router.get('/facturas-pendientes', getFacturasPendientes)
router.get('/recibido-vs-facturado', getRecibidoVsFacturado)
router.get('/estado-cuenta', getEstadoCuenta)
router.get('/explosion-insumos/:id', getExplosionInsumos)
router.get('/explosion-insumos/:id/excel', exportarExplosionExcel)
router.get('/historial-variaciones/:id', getHistorialVariaciones)
router.get('/avances-obras', getAvancesObras)

export default router
