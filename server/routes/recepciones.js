import { Router } from 'express'
import { getRecepciones, getRecepcionById, getRecepcionesPendientes, createRecepcion, createRecepcionBulk } from '../controllers/recepcionController.js'

const router = Router()

router.get('/',            getRecepciones)
router.get('/pendientes',  getRecepcionesPendientes)
router.get('/:id',         getRecepcionById)
router.post('/',           createRecepcion)
router.post('/bulk',       createRecepcionBulk)

export default router
