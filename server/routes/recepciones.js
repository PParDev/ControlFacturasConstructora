import { Router } from 'express'
import { getRecepciones, getRecepcionesPendientes, createRecepcion } from '../controllers/recepcionController.js'

const router = Router()

router.get('/', getRecepciones)
router.get('/pendientes', getRecepcionesPendientes)
router.post('/', createRecepcion)

export default router
