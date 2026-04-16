import { z } from 'zod'

export const obraSchema = z.object({
  nombre: z.string({ required_error: "El nombre es requerido" }).min(2, "El nombre es muy corto"),
  cliente: z.string().optional(),
  ubicacion: z.string().optional(),
  fecha_inicio: z.string().optional(),
  fecha_cierre: z.string().optional(),
  status: z.string().optional()
})
