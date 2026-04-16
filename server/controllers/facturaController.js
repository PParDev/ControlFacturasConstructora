import { crearFacturaSchema } from '../schemas/facturaSchema.js'
import { registrarNuevaFactura } from '../services/facturaService.js'

export const crearFactura = (req, res) => {
  try {
    // 1. Validamos la información que llegó de React
    const datosValidados = crearFacturaSchema.parse(req.body)

    // 2. Mandamos la información limpia al servicio para que haga el trabajo
    const nuevaFactura = registrarNuevaFactura(datosValidados)

    // 3. Respondemos con éxito (201 Created)
    res.status(201).json(nuevaFactura)
    
  } catch (error) {
    // Si Zod detecta que faltan datos o tienen mal formato
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    }
    
    // Si la lógica de negocio (el Servicio) rechaza la operación por el monto
    res.status(422).json({ error: error.message })
  }
}
