import db from '../db.js'
import xlsx from 'xlsx'

export const getCatalogos = (obra_id, q) => {
  let query = `SELECT * FROM catalogo_obras WHERE obra_id = ?`
  const params = [obra_id]

  if (q) {
    query += ` AND (nombre LIKE ? OR codigo LIKE ?)`
    params.push(`%${q}%`, `%${q}%`)
  }

  query += ` ORDER BY codigo ASC`
  return db.prepare(query).all(...params)
}

export const getCatalogoById = (id) => {
  const row = db.prepare('SELECT * FROM catalogo_obras WHERE id = ?').get(id)
  if (!row) throw new Error('Producto no encontrado')
  return row
}

export const getCatalogoHistorial = (id) => {
  return db.prepare(`
    SELECT * FROM catalogo_historial_precios
    WHERE catalogo_obra_id = ?
    ORDER BY fecha DESC
  `).all(id)
}

export const createCatalogo = (datos) => {
  const { obra_id, codigo, nombre, unidad, cantidad_presupuestada, precio_referencia } = datos
  const info = db.prepare(`
    INSERT INTO catalogo_obras (obra_id, codigo, nombre, unidad, cantidad_presupuestada, precio_referencia)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(obra_id, codigo, nombre, unidad || 'pza', cantidad_presupuestada || 0, precio_referencia || 0)
  return getCatalogoById(info.lastInsertRowid)
}

export const updateCatalogo = (id, datos) => {
  getCatalogoById(id)
  db.prepare(`
    UPDATE catalogo_obras SET
      nombre = COALESCE(?, nombre),
      unidad = COALESCE(?, unidad),
      cantidad_presupuestada = COALESCE(?, cantidad_presupuestada),
      precio_referencia = COALESCE(?, precio_referencia)
    WHERE id = ?
  `).run(datos.nombre, datos.unidad, datos.cantidad_presupuestada, datos.precio_referencia, id)
  return getCatalogoById(id)
}

export const toggleCatalogoStatus = (id) => {
  const row = getCatalogoById(id)
  const nuevo = row.status === 'Activo' ? 'Inactivo' : 'Activo'
  db.prepare('UPDATE catalogo_obras SET status = ? WHERE id = ?').run(nuevo, row.id)
  return { ...row, status: nuevo }
}

export const importarExcel = (obra_id, fileBuffer) => {
  const wb = xlsx.read(fileBuffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // === Detección automática del formato ===
  const HEADER_KEYWORDS = ['nombre', 'concepto', 'material', 'codigo', 'unidad', 'cantidad', 'volumen', 'precio', 'costo']
  let headerRowIdx = 0

  for (let i = 0; i < Math.min(raw.length, 15); i++) {
    const rowText = raw[i].map(c => String(c).toLowerCase().trim()).join(' ')
    const matches = HEADER_KEYWORDS.filter(k => rowText.includes(k))
    if (matches.length >= 2) {
      headerRowIdx = i
      break
    }
  }

  const headerRow = raw[headerRowIdx].map(c => String(c).trim())
  const dataRows  = raw.slice(headerRowIdx + 1)

  const findCol = (...aliases) => {
    for (const alias of aliases) {
      const idx = headerRow.findIndex(h => h.toLowerCase().includes(alias.toLowerCase()))
      if (idx !== -1) return idx
    }
    return -1
  }

  const colNombre   = findCol('nombre', 'concepto', 'material', 'descripcion')
  const colUnidad   = findCol('unidad', 'u.m.', 'um')
  const colCantidad = findCol('volumen', 'cantidad', 'cant', 'vol')
  const colPrecio   = findCol('costo unitario', 'precio unitario', 'precio', 'costo')
  const colCodigo   = findCol('codigo', 'código', 'clave')

  const usingPositional = colNombre === -1 || colCantidad === -1

  const insertStmt = db.prepare(`
    INSERT INTO catalogo_obras (obra_id, codigo, nombre, unidad, cantidad_presupuestada, precio_referencia)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const updateStmt = db.prepare(`
    UPDATE catalogo_obras
    SET precio_referencia = ?, cantidad_presupuestada = ?, unidad = ?
    WHERE id = ?
  `)
  const historialStmt = db.prepare(`
    INSERT INTO catalogo_historial_precios
      (catalogo_obra_id, precio_anterior, precio_nuevo, cantidad_anterior, cantidad_nueva, fecha, motivo)
    VALUES (?, ?, ?, ?, ?, ?, 'Reimportación Excel')
  `)

  const hoy = new Date().toISOString().slice(0, 10)
  let insertados  = 0
  let actualizados = 0

  db.transaction(() => {
    for (const row of dataRows) {
      let nombre, unidad, cantidad, precio, codigo

      if (usingPositional) {
        nombre   = String(row[0] ?? '').trim()
        unidad   = String(row[2] ?? '').trim()
        cantidad = Number(row[3])
        precio   = Number(row[4])
        codigo   = ''
      } else {
        nombre   = String(row[colNombre]   ?? '').trim()
        unidad   = colUnidad   !== -1 ? String(row[colUnidad]   ?? '').trim()  : 'pza'
        cantidad = colCantidad !== -1 ? Number(row[colCantidad] ?? 0) : 0
        precio   = colPrecio   !== -1 ? Number(row[colPrecio]   ?? 0) : 0
        codigo   = colCodigo   !== -1 ? String(row[colCodigo]   ?? '').trim()  : ''
      }

      if (!nombre || nombre.length < 2) continue
      if (isNaN(cantidad) || cantidad <= 0) continue
      if (isNaN(precio)) precio = 0

      if (!codigo) codigo = `I-${String(insertados + actualizados + 1).padStart(3, '0')}`

      // Buscar si ya existe: primero por (obra_id, codigo), luego por (obra_id, nombre)
      let existing = null
      if (codigo && !codigo.startsWith('I-')) {
        existing = db.prepare(
          `SELECT * FROM catalogo_obras WHERE obra_id = ? AND codigo = ?`
        ).get(obra_id, codigo)
      }
      if (!existing) {
        existing = db.prepare(
          `SELECT * FROM catalogo_obras WHERE obra_id = ? AND nombre = ?`
        ).get(obra_id, nombre)
      }

      if (existing) {
        // Solo actualizar si algo cambió
        const precioChanged   = Math.abs(existing.precio_referencia - precio) > 0.001
        const cantidadChanged = Math.abs(existing.cantidad_presupuestada - cantidad) > 0.001
        if (precioChanged || cantidadChanged) {
          if (precioChanged) {
            historialStmt.run(
              existing.id,
              existing.precio_referencia,
              precio,
              existing.cantidad_presupuestada,
              cantidad,
              hoy
            )
          }
          updateStmt.run(precio, cantidad, unidad || 'pza', existing.id)
          actualizados++
        }
      } else {
        insertStmt.run(obra_id, codigo, nombre, unidad || 'pza', cantidad, precio)
        insertados++
      }
    }
  })()

  return {
    message: `${insertados} conceptos nuevos, ${actualizados} actualizados.`,
    insertados,
    actualizados,
    formato: usingPositional ? 'Structura (posicional)' : 'Estándar (por encabezados)',
    hoja: wb.SheetNames[0]
  }
}
