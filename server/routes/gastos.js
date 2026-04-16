import { Router } from 'express'
import { getGastos, createGasto } from '../controllers/gastoController.js'

const router = Router()

router.get('/', getGastos)
router.post('/', createGasto)

export default router
