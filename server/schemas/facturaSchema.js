import { z } from 'zod'

export const detalleFacturaSchema = z.object({
  catalogo_obra_id: z.number().int().positive(),
  cantidad: z.number().positive(),
  precio_unitario: z.number().positive(),
  subtotal: z.number().nonnegative()
})

export const crearFacturaSchema = z.object({
  obra_id:          z.number({ required_error: "La obra_id es requerida" }).int().positive(),
  recepcion_id:     z.number().int().positive().nullable().optional(),
  proveedor:        z.string().min(2, "El nombre del proveedor es muy corto"),
  monto:            z.number().positive("El monto debe ser mayor a 0"),
  fecha:            z.string().optional(),
  folio_proveedor:  z.string().optional(),
  pago_inmediato:   z.boolean().optional(),
  cuenta_id:        z.number().int().positive().nullable().optional(),
  forma_pago:       z.string().optional(),
  referencia:       z.string().optional(),
  detalles:         z.array(detalleFacturaSchema).optional()
}).refine(
  (data) => !data.pago_inmediato || !!data.cuenta_id,
  { message: "Debes seleccionar una cuenta bancaria para el pago inmediato", path: ["cuenta_id"] }
).refine(
  (data) => {
    if (!data.detalles || data.detalles.length === 0) return true
    const sumaDetalles = data.detalles.reduce((s, d) => s + d.subtotal, 0)
    // Tolerancia de $1 para diferencias de redondeo
    return Math.abs(sumaDetalles - data.monto) <= 1
  },
  { message: "El monto total no coincide con la suma de los detalles", path: ["monto"] }
)
