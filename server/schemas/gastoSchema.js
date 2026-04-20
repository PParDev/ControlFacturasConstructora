import { z } from 'zod'

export const gastoSchema = z.object({
  obra_id:   z.number({ required_error: "La obra_id es requerida" }).int().positive(),
  categoria: z.enum(['Caja chica', 'Herramientas', 'Mano de obra']).default('Caja chica'),
  concepto:  z.string().optional(),
  monto:     z.number({ required_error: "El monto es requerido" }).positive("El monto debe ser mayor a 0"),
  fecha:     z.string().optional(),
  cuenta_id:         z.number().int().positive().nullable().optional(),
  catalogo_obra_id:  z.number().int().positive().nullable().optional()
})
