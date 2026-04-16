import { Router } from 'express'
import multer from 'multer'
import { importarCatalogo } from '../controllers/importadorController.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// Esperamos que el form-data envíe el excel bajo el campo "excel" y el "obra_id" adjunto
router.post('/', upload.single('excel'), importarCatalogo)

export default router
