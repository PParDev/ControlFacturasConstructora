import { cuentaBancariaSchema, transaccionSchema } from '../schemas/cuentasSchema.js'
import * as cuentasService from '../services/cuentasService.js'

export const getCuentas = (req, res) => {
  res.json(cuentasService.getCuentas())
}

export const createCuenta = (req, res) => {
  try {
    // Solo se permiten 2 cuentas: 1 Cheques y 1 Crédito
    const existentes = cuentasService.getCuentas()
    if (existentes.length >= 2) {
      return res.status(422).json({ error: 'Solo se permiten 2 cuentas en el sistema: una de Cheques y una de Crédito.' })
    }
    const datosValidados = cuentaBancariaSchema.parse(req.body)
    const tipoDuplicado  = existentes.find(c => c.tipo === datosValidados.tipo)
    if (tipoDuplicado) {
      return res.status(422).json({ error: `Ya existe una cuenta de tipo ${datosValidados.tipo}.` })
    }
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

export const updateSaldoInicial = (req, res) => {
  try {
    const cuentaId = parseInt(req.params.id)
    const saldoInicial = parseFloat(req.body.saldo_inicial)
    
    if (isNaN(cuentaId) || isNaN(saldoInicial)) {
      return res.status(400).json({ error: 'Datos inválidos' })
    }

    const actualizado = cuentasService.updateSaldoInicial(cuentaId, saldoInicial)
    res.json(actualizado)
  } catch (error) {
    res.status(422).json({ error: error.message })
  }
}
