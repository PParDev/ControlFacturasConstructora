import { catalogoSchema } from '../schemas/catalogoSchema.js'
import * as catalogoService from '../services/catalogoService.js'

export const getCatalogos = (req, res) => {
  const { obra_id } = req.query
  if (!obra_id) return res.status(400).json({ error: 'obra_id requerdido' })
  const ObjectList = catalogoService.getCatalogos(obra_id, req.query.q)
  res.json(ObjectList)
}

export const getCatalogoById = (req, res) => {
  try {
    const row = catalogoService.getCatalogoById(req.params.id)
    res.json(row)
  } catch (error) {
    res.status(404).json({ error: error.message })
  }
}

export const createCatalogo = (req, res) => {
  try {
    const datosValidados = catalogoSchema.parse(req.body)
    const nuevo = catalogoService.createCatalogo(datosValidados)
    res.status(201).json(nuevo)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    res.status(422).json({ error: error.message })
  }
}

export const updateCatalogo = (req, res) => {
  try {
    const datosValidados = catalogoSchema.partial().parse(req.body)
    const modificado = catalogoService.updateCatalogo(req.params.id, datosValidados)
    res.json(modificado)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    if (error.message === 'Producto no encontrado') return res.status(404).json({ error: error.message })
    res.status(422).json({ error: error.message })
  }
}

export const toggleCatalogoStatus = (req, res) => {
  try {
    const toggled = catalogoService.toggleCatalogoStatus(req.params.id)
    res.json(toggled)
  } catch (error) {
    if (error.message === 'Producto no encontrado') return res.status(404).json({ error: error.message })
    res.status(422).json({ error: error.message })
  }
}

export const importarExcel = (req, res) => {
  try {
    const { obra_id } = req.body
    if (!obra_id) return res.status(400).json({ error: 'obra_id requerido' })
    if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo Excel' })

    const result = catalogoService.importarExcel(obra_id, req.file.buffer)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar archivo Excel: ' + error.message })
  }
}
