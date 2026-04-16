import { z } from 'zod'

export const catalogoSchema = z.object({
  obra_id: z.number({ required_error: "El ID de la obra es requerido" }),
  codigo: z.string().optional().default(''),
  nombre: z.string({ required_error: "El nombre es requerido" }).min(2, "El nombre es muy corto"),
  descripcion: z.string().optional().default(''),
  unidad: z.string().optional().default('pieza'),
  categoria: z.string().optional().default(''),
  cantidad_presupuestada: z.number().nonnegative().optional().default(0),
  precio_referencia: z.number().nonnegative().optional().default(0),
  status: z.string().optional().default('Activo')
})
