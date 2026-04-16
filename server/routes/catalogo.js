import { Router } from 'express'
import multer from 'multer'
import { getCatalogos, getCatalogoById, createCatalogo, updateCatalogo, toggleCatalogoStatus, importarExcel } from '../controllers/catalogoController.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() }) // Guardar archivo en memoria

router.get('/', getCatalogos)
router.post('/importar', upload.single('archivo'), importarExcel)
router.get('/:id', getCatalogoById)
router.post('/', createCatalogo)
router.put('/:id', updateCatalogo)
router.patch('/:id/toggle', toggleCatalogoStatus)

export default router
