import { pedidoSchema, bulkPedidoSchema } from '../schemas/pedidoSchema.js'
import * as pedidoService from '../services/pedidoService.js'

export const getPedidos = (req, res) => {
  res.json(pedidoService.getPedidos(req.query.obra_id, req.query.status))
}

export const createPedido = (req, res) => {
  try {
    const datosValidados = pedidoSchema.parse(req.body)
    const nuevo = pedidoService.createPedido(datosValidados)
    res.status(201).json(nuevo)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    if (error.message === 'Obra no encontrada') return res.status(404).json({ error: error.message })
    res.status(422).json({ error: error.message })
  }
}

export const createPedidoBulk = (req, res) => {
  try {
    const datosValidados = bulkPedidoSchema.parse(req.body)
    const nuevos = pedidoService.createPedidosBulk(datosValidados)
    res.status(201).json(nuevos)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    if (error.message === 'Obra no encontrada') return res.status(404).json({ error: error.message })
    res.status(422).json({ error: error.message })
  }
}

export const updatePedido = (req, res) => {
  try {
    const datosValidados = pedidoSchema.partial().parse(req.body)
    const modificado = pedidoService.updatePedido(req.params.id, datosValidados)
    res.json(modificado)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    if (error.message === 'Pedido no encontrado') return res.status(404).json({ error: error.message })
    res.status(422).json({ error: error.message })
  }
}
