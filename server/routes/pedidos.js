import { Router } from 'express'
import { getPedidos, createPedido, createPedidoBulk, updatePedido } from '../controllers/pedidoController.js'

const router = Router()

router.get('/', getPedidos)
router.post('/', createPedido)
router.post('/bulk', createPedidoBulk)
router.put('/:id', updatePedido)

export default router
