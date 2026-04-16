import { cuentaBancariaSchema, transaccionSchema } from '../schemas/cuentasSchema.js'
import * as cuentasService from '../services/cuentasService.js'

export const getCuentas = (req, res) => {
  res.json(cuentasService.getCuentas())
}

export const createCuenta = (req, res) => {
  try {
    const datosValidados = cuentaBancariaSchema.parse(req.body)
    const nuevo = cuentasService.createCuenta(datosValidados)
    res.status(201).json(nuevo)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    res.status(422).json({ error: error.message })
  }
}

export const getTransacciones = (req, res) => {
  const cuentaId = parseInt(req.params.id)
  res.json(cuentasService.getTransacciones(cuentaId))
}

export const createTransaccion = (req, res) => {
  try {
    req.body.cuenta_id = parseInt(req.params.id) // Override with param
    const datosValidados = transaccionSchema.parse(req.body)
    const nuevo = cuentasService.createTransaccion(datosValidados)
    res.status(201).json(nuevo)
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    res.status(422).json({ error: error.message })
  }
}

export const getResumen = (req, res) => {
  res.json(cuentasService.getResumen())
}
