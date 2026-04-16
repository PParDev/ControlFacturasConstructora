import { gastoSchema } from '../schemas/gastoSchema.js'
import * as gastoService from '../services/gastoService.js'

export const getGastos = (req, res) => {
  const rows = gastoService.getGastos(req.query.obra_id, req.query.categoria)
  res.json(rows)
}

export const createGasto = (req, res) => {
  try {
    const datosValidados = gastoSchema.parse(req.body)
    const nuevo = gastoService.createGasto(datosValidados)
    res.status(201).json(nuevo)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    if (error.message === 'Obra no encontrada') return res.status(404).json({ error: error.message })
    res.status(422).json({ error: error.message })
  }
}
