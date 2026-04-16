import { z } from 'zod'

export const detalleFacturaSchema = z.object({
  catalogo_obra_id: z.number().int().positive(),
  cantidad: z.number().positive(),
  precio_unitario: z.number().positive(),
  subtotal: z.number().nonnegative()
})

export const crearFacturaSchema = z.object({
  obra_id: z.number({ required_error: "La obra_id es requerida" }).int().positive(),
  recepcion_id: z.number().int().positive().nullable().optional(),
  proveedor: z.string().min(2, "El nombre del proveedor es muy corto"),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  fecha: z.string().optional(),
  detalles: z.array(detalleFacturaSchema).optional()
})
