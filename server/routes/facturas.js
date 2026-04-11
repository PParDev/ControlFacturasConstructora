import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Genera folio FAC-YYYY-XXXX
function siguienteFolio() {
  const year = new Date().getFullYear()
  const row = db.prepare(`
    SELECT MAX(CAST(SUBSTR(folio, -4) AS INTEGER)) as max_n
    FROM facturas WHERE folio LIKE 'FAC-${year}-%'
  `).get()
  const n = (row.max_n || 0) + 1
  return `FAC-${year}-${String(n).padStart(4, '0')}`
}

// GET /api/facturas — listar (filtrable ?obra_id=1&status=Pendiente)
router.get('/', (req, res) => {
  const { obra_id, status } = req.query
  let sql = `
    SELECT f.*, o.nombre as obra_nombre
    FROM facturas f
    LEFT JOIN obras o ON o.id = f.obra_id
    WHERE 1=1
  `
  const params = []
  if (obra_id) { sql += ' AND f.obra_id = ?'; params.push(obra_id) }
  if (status)  { sql += ' AND f.status = ?';  params.push(status)  }
  sql += ' ORDER BY f.id DESC'

  res.json(db.prepare(sql).all(...params))
})

// GET /api/facturas/pendientes — facturas sin pagar (para dropdown de Pagos)
router.get('/pendientes', (_req, res) => {
  const rows = db.prepare(`
    SELECT f.*, o.nombre as obra_nombre
    FROM facturas f
    LEFT JOIN obras o ON o.id = f.obra_id
    WHERE f.status = 'Pendiente'
    ORDER BY f.fecha ASC
  `).all()
  res.json(rows)
})

// POST /api/facturas — registrar factura con validación vs recepción
router.post('/', (req, res) => {
  const { obra_id, recepcion_id = null, proveedor = '', monto, fecha } = req.body
  if (!obra_id || !monto) return res.status(400).json({ error: 'obra_id y monto son requeridos' })

  // Validación: si tiene recepción, el monto no puede superar lo recibido
  let monto_max_facturable = null
  if (recepcion_id) {
    const rec = db.prepare('SELECT * FROM recepciones WHERE id = ?').get(recepcion_id)
    if (!rec) return res.status(404).json({ error: 'Recepción no encontrada' })

    // Buscamos precio de referencia del producto en catálogo (si existe)
    const cat = db.prepare(
      'SELECT precio_referencia FROM catalogo_productos WHERE nombre LIKE ?'
    ).get(`%${rec.producto}%`)

    if (cat) {
      monto_max_facturable = rec.cantidad_recibida * cat.precio_referencia
      if (monto > monto_max_facturable) {
        return res.status(422).json({
          error: `Monto excede lo facturable. Máximo: $${monto_max_facturable.toFixed(2)} (${rec.cantidad_recibida} recibidas × $${cat.precio_referencia} precio ref.)`,
          monto_max_facturable,
        })
      }
    }
  }

  const folio      = siguienteFolio()
  const fechaFinal = fecha || new Date().toISOString().split('T')[0]

  const info = db.prepare(`
    INSERT INTO facturas (folio, obra_id, recepcion_id, proveedor, monto, monto_max_facturable, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(folio, obra_id, recepcion_id, proveedor, monto, monto_max_facturable, fechaFinal)

  res.status(201).json(db.prepare('SELECT * FROM facturas WHERE id = ?').get(info.lastInsertRowid))
})

export default router
