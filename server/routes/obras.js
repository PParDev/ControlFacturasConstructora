import { Router } from 'express'
import { getObras, getObraById, createObra, updateObra, deleteObra } from '../controllers/obraController.js'

const router = Router()

router.get('/', getObras)
router.get('/:id', getObraById)
router.post('/', createObra)
router.put('/:id', updateObra)
router.delete('/:id', deleteObra)

export default router
