import { z } from 'zod'

export const cuentaBancariaSchema = z.object({
  nombre: z.string({ required_error: "El nombre es requerido" }).min(2, "Nombre muy corto"),
  tipo: z.enum(['Fiscal', 'Cheques', 'Crédito', 'Caja Chica']).default('Fiscal'),
  saldo_inicial: z.number().default(0),
  obra_id: z.number().int().positive().nullable().optional()
})

export const transaccionSchema = z.object({
  cuenta_id: z.number({ required_error: "La cuenta es requerida" }).int().positive(),
  fecha: z.string().optional(),
  tipo: z.enum(['Cargo', 'Abono']).default('Cargo'),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  concepto: z.string().optional(),
  beneficiario: z.string().optional(),
  obra_id: z.number().int().positive().nullable().optional(),
  categoria: z.string().optional()
})
