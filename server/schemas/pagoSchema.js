import { z } from 'zod'

export const pagoSchema = z.object({
  factura_id: z.number({ required_error: "La factura_id es requerida" }).int().positive(),
  forma: z.string().optional(), // en frontend manda "forma"
  forma_pago: z.string().optional(), // por si acaso
  referencia: z.string().optional(),
  monto: z.number({ required_error: "El monto es requerido" }).positive("El monto debe ser mayor a 0"),
  fecha: z.string().optional()
})
