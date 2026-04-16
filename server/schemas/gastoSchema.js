import { z } from 'zod'

export const gastoSchema = z.object({
  obra_id: z.number({ required_error: "La obra_id es requerida" }).int().positive(),
  categoria: z.string().optional(),
  concepto: z.string().optional(),
  monto: z.number({ required_error: "El monto es requerido" }).positive("El monto debe ser mayor a 0"),
  fecha: z.string().optional()
})
