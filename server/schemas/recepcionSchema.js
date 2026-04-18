import { z } from 'zod'

export const recepcionSchema = z.object({
  obra_id:           z.number({ required_error: "La obra_id es requerida" }).int().positive(),
  pedido_id:         z.number().int().positive().nullable().optional(),
  catalogo_obra_id:  z.number().int().positive().nullable().optional(),
  tipo_flujo:        z.string().optional(),
  proveedor:         z.string().optional(),
  producto:          z.string().optional(),
  cantidad_recibida: z.number({ required_error: "La cantidad_recibida es requerida" }).positive("La cantidad recibida debe ser mayor a 0"),
  entrego:           z.string().optional(),
  recibio:           z.string().optional(),
  fecha:             z.string().optional()
})

export const bulkRecepcionSchema = z.array(recepcionSchema).min(1, "Debe enviar al menos una recepción")
