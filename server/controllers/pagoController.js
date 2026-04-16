import { pagoSchema } from '../schemas/pagoSchema.js'
import * as pagoService from '../services/pagoService.js'

export const getPagos = (req, res) => {
  res.json(pagoService.getPagos(req.query.obra_id))
}

export const createPago = (req, res) => {
  try {
    const datosValidados = pagoSchema.parse(req.body)
    const nuevo = pagoService.createPago(datosValidados)
    res.status(201).json(nuevo)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    if (error.message === 'Factura no encontrada') return res.status(404).json({ error: error.message })
    if (error.message === 'La factura ya está pagada') return res.status(409).json({ error: error.message })
    res.status(422).json({ error: error.message })
  }
}
