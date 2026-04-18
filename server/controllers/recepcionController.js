import { recepcionSchema, bulkRecepcionSchema } from '../schemas/recepcionSchema.js'
import * as recepcionService from '../services/recepcionService.js'

export const getRecepciones = (req, res) => {
  res.json(recepcionService.getRecepciones(req.query.obra_id))
}

export const getRecepcionById = (req, res) => {
  const r = recepcionService.getRecepcionById(req.params.id)
  if (!r) return res.status(404).json({ error: 'Recepción no encontrada' })
  res.json(r)
}

export const getRecepcionesPendientes = (req, res) => {
  res.json(recepcionService.getRecepcionesPendientes())
}

export const createRecepcion = (req, res) => {
  try {
    const datosValidados = recepcionSchema.parse(req.body)
    const nueva = recepcionService.createRecepcion(datosValidados)
    res.status(201).json(nueva)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    if (error.message === 'Pedido no encontrado') return res.status(404).json({ error: error.message })
    res.status(422).json({ error: error.message })
  }
}

export const createRecepcionBulk = (req, res) => {
  try {
    const datosValidados = bulkRecepcionSchema.parse(req.body)
    const nuevas = recepcionService.createRecepcionBulk(datosValidados)
    res.status(201).json(nuevas)
  } catch (error) {
    console.error("DEBUG BULK ERROR:", error)
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    res.status(422).json({ error: error.message })
  }
}
