import * as xlsx from 'xlsx'
import db from '../db.js'

export const importarCatalogo = (req, res) => {
  try {
    const file = req.file
    const obra_id = req.body.obra_id

    if (!file)    return res.status(400).json({ error: 'No se incluyó archivo Excel.' })
    if (!obra_id) return res.status(400).json({ error: 'Falta el obra_id.' })

    const workbook = xlsx.read(file.buffer, { type: 'buffer' })
    const ws       = workbook.Sheets[workbook.SheetNames[0]]
    const raw      = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' })

    if (raw.length < 2) {
      return res.status(400).json({ error: 'El archivo está vacío o no tiene el formato correcto.' })
    }

    // ── Detectar fila de encabezados automáticamente ─────────────────────────
    const HEADER_KEYWORDS = ['nombre', 'concepto', 'material', 'codigo', 'unidad', 'cantidad', 'volumen', 'precio', 'costo']
    let headerRowIdx = 0

    for (let i = 0; i < Math.min(raw.length, 20); i++) {
      const rowText = raw[i].map(c => String(c).toLowerCase().trim()).join(' ')
      const matches = HEADER_KEYWORDS.filter(k => rowText.includes(k))
      if (matches.length >= 2) {
        headerRowIdx = i
        break
      }
    }

    const headerRow = raw[headerRowIdx].map(c => String(c).trim())
    const dataRows  = raw.slice(headerRowIdx + 1)

    // ── Detectar índice de columnas por alias ─────────────────────────────────
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
    const colCodigo   = findCol('codigo', 'código', 'clave', 'id')

    // Si no encontramos columna de nombre y cantidad, usar formato posicional Structura
    // Structura: col0=nombre, col2=unidad, col3=volumen, col4=costo unitario
    const usingPositional = colNombre === -1 || colCantidad === -1

    // ── Inserción en transacción ───────────────────────────────────────────────
    const stmt = db.prepare(`
      INSERT INTO catalogo_obras (obra_id, codigo, nombre, unidad, cantidad_presupuestada, precio_referencia)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    let insertados = 0
    let omitidos   = 0

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
          unidad   = colUnidad   !== -1 ? String(row[colUnidad]   ?? '').trim() : 'pza'
          cantidad = colCantidad !== -1 ? Number(row[colCantidad] ?? 0) : 0
          precio   = colPrecio   !== -1 ? Number(row[colPrecio]   ?? 0) : 0
          codigo   = colCodigo   !== -1 ? String(row[colCodigo]   ?? '').trim() : ''
        }

        // Omitir filas sin nombre, sin cantidad válida, o filas de subtotales
        if (!nombre || nombre.length < 2)     { omitidos++; continue }
        if (isNaN(cantidad) || cantidad <= 0)  { omitidos++; continue }
        if (isNaN(precio)) precio = 0

        if (!codigo) codigo = `I-${String(insertados + 1).padStart(3, '0')}`

        stmt.run(obra_id, codigo, nombre, unidad || 'pza', cantidad, precio)
        insertados++
      }
    })()

    res.json({
      message: `${insertados} conceptos importados correctamente.`,
      insertados,
      omitidos,
      formato: usingPositional ? 'Structura (posicional)' : 'Estándar (encabezados)',
      hoja: workbook.SheetNames[0]
    })

  } catch (error) {
    console.error('Error importando catálogo:', error)
    res.status(500).json({ error: 'Error procesando el archivo: ' + error.message })
  }
}
