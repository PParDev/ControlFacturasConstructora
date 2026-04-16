import { obraSchema } from '../schemas/obraSchema.js'
import * as obraService from '../services/obraService.js'

export const getObras = (req, res) => {
  res.json(obraService.getObras())
}

export const getObraById = (req, res) => {
  try {
    res.json(obraService.getObraById(req.params.id))
  } catch (error) {
    res.status(404).json({ error: error.message })
  }
}

export const createObra = (req, res) => {
  try {
    const datosValidados = obraSchema.parse(req.body)
    const nueva = obraService.createObra(datosValidados)
    res.status(201).json(nueva)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    res.status(422).json({ error: error.message })
  }
}

export const updateObra = (req, res) => {
  try {
    const datosValidados = obraSchema.partial().parse(req.body)
    const act = obraService.updateObra(req.params.id, datosValidados)
    res.json(act)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    if (error.message === 'Obra no encontrada') return res.status(404).json({ error: error.message })
    res.status(422).json({ error: error.message })
  }
}

export const deleteObra = (req, res) => {
  try {
    obraService.deleteObra(req.params.id)
    res.json({ ok: true })
  } catch (error) {
    if (error.message === 'Obra no encontrada') return res.status(404).json({ error: error.message })
    res.status(422).json({ error: error.message })
  }
}
