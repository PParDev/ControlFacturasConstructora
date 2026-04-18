import { Router } from 'express'
import { getCuentas, createCuenta, getTransacciones, createTransaccion, getResumen, updateSaldoInicial } from '../controllers/cuentasController.js'

const router = Router()

router.get('/', getCuentas)
router.post('/', createCuenta)
router.get('/:id/transacciones', getTransacciones)
router.post('/:id/transacciones', createTransaccion)
router.get('/resumen', getResumen)
router.put('/:id/saldo-inicial', updateSaldoInicial)

export default router
