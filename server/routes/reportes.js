import { Router } from 'express'
import {
  getReporteObra, getFacturasPendientes, getRecibidoVsFacturado,
  getEstadoCuenta, getExplosionInsumos, getAvancesObras, exportarExplosionExcel,
  getHistorialVariaciones, getFlujoCaja, getGastoMensual, getRankingProveedores,
  getGastosDirectosObra
} from '../controllers/reporteController.js'

const router = Router()

router.get('/obra/:id',                   getReporteObra)
router.get('/facturas-pendientes',        getFacturasPendientes)
router.get('/recibido-vs-facturado',      getRecibidoVsFacturado)
router.get('/estado-cuenta',              getEstadoCuenta)
router.get('/explosion-insumos/:id',      getExplosionInsumos)
router.get('/explosion-insumos/:id/excel', exportarExplosionExcel)
router.get('/historial-variaciones/:id',  getHistorialVariaciones)
router.get('/avances-obras',              getAvancesObras)
router.get('/flujo-caja',                 getFlujoCaja)
router.get('/gasto-mensual',              getGastoMensual)
router.get('/ranking-proveedores',        getRankingProveedores)
router.get('/gastos-directos/:obra_id',   getGastosDirectosObra)

export default router
