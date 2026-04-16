import { Router } from 'express'
import { getPagos, createPago } from '../controllers/pagoController.js'

const router = Router()

router.get('/', getPagos)
router.post('/', createPago)

export default router
