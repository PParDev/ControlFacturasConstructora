import { z } from 'zod'

export const recepcionSchema = z.object({
  obra_id: z.number({ required_error: "La obra_id es requerida" }).int().positive(),
  pedido_id: z.number().int().positive().nullable().optional(),
  tipo_flujo: z.string().optional(),
  proveedor: z.string().optional(),
  producto: z.string().optional(),
  cantidad_recibida: z.number({ required_error: "La cantidad_recibida es requerida" }).nonnegative(),
  entrego: z.string().optional(),
  recibio: z.string().optional(),
  fecha: z.string().optional()
})
