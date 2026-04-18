import { z } from 'zod'

export const pedidoSchema = z.object({
  obra_id: z.number({ required_error: "La obra_id es requerida" }).int().positive(),
  proveedor: z.string().optional(),
  producto: z.string().optional(),
  cantidad: z.number({ required_error: "La cantidad es requerida" }).positive(),
  unidad: z.string().optional(),
  notas: z.string().optional(),
  fecha: z.string().optional(),
  status: z.string().optional(),
  catalogo_obra_id: z.number().int().positive().nullable().optional()
})

export const bulkPedidoSchema = z.array(pedidoSchema).min(1, "Debe enviar al menos un pedido")
