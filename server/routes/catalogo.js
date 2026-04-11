import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Genera folio automático: P-NNN (basado en max código numérico existente)
function siguienteCodigo() {
  const row = db.prepare(`
    SELECT MAX(CAST(REPLACE(codigo,'P-','') AS INTEGER)) as max_n FROM catalogo_productos
  `).get()
  const n = (row.max_n || 0) + 1
  return `P-${String(n).padStart(3, '0')}`
}

// GET /api/catalogo — listar productos (con búsqueda ?q=varilla)
router.get('/', (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : '%'
  const rows = db.prepare(`
    SELECT * FROM catalogo_productos
    WHERE (nombre LIKE ? OR codigo LIKE ? OR categoria LIKE ?)
    ORDER BY codigo ASC
  `).all(q, q, q)
  res.json(rows)
})

// GET /api/catalogo/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM catalogo_productos WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Producto no encontrado' })
  res.json(row)
})

// POST /api/catalogo — agregar producto
router.post('/', (req, res) => {
  const { nombre, descripcion = '', unidad = 'pza', categoria = '', precio_referencia = 0, proveedor_habitual = '', codigo } = req.body
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })

  const cod = codigo || siguienteCodigo()

  const info = db.prepare(`
    INSERT INTO catalogo_productos (codigo, nombre, descripcion, unidad, categoria, precio_referencia, proveedor_habitual)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(cod, nombre, descripcion, unidad, categoria, precio_referencia, proveedor_habitual)

  res.status(201).json(db.prepare('SELECT * FROM catalogo_productos WHERE id = ?').get(info.lastInsertRowid))
})

// PUT /api/catalogo/:id — editar producto
router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM catalogo_productos WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Producto no encontrado' })

  const { nombre, descripcion, unidad, categoria, precio_referencia, proveedor_habitual } = req.body
  db.prepare(`
    UPDATE catalogo_productos SET
      nombre             = COALESCE(?, nombre),
      descripcion        = COALESCE(?, descripcion),
      unidad             = COALESCE(?, unidad),
      categoria          = COALESCE(?, categoria),
      precio_referencia  = COALESCE(?, precio_referencia),
      proveedor_habitual = COALESCE(?, proveedor_habitual)
    WHERE id = ?
  `).run(nombre, descripcion, unidad, categoria, precio_referencia, proveedor_habitual, req.params.id)

  res.json(db.prepare('SELECT * FROM catalogo_productos WHERE id = ?').get(req.params.id))
})

// PATCH /api/catalogo/:id/toggle — activar / desactivar
router.patch('/:id/toggle', (req, res) => {
  const row = db.prepare('SELECT * FROM catalogo_productos WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Producto no encontrado' })

  const nuevo = row.status === 'Activo' ? 'Inactivo' : 'Activo'
  db.prepare('UPDATE catalogo_productos SET status = ? WHERE id = ?').run(nuevo, row.id)
  res.json({ ...row, status: nuevo })
})

export default router
