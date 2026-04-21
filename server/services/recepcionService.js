import db from '../db.js'

function siguienteFolio() {
  const row = db.prepare(`
    SELECT MAX(CAST(REPLACE(folio,'REC-','') AS INTEGER)) as max_n FROM recepciones
  `).get()
  const n = (row.max_n || 0) + 1
  return `REC-${String(n).padStart(3, '0')}`
}

export const getRecepciones = (obra_id) => {
  let sql = `
    SELECT r.*, o.nombre as obra_nombre,
           (SELECT COUNT(*) FROM recepcion_detalles WHERE recepcion_id = r.id) as total_items,
           (SELECT GROUP_CONCAT(producto, ', ') FROM recepcion_detalles WHERE recepcion_id = r.id) as resumen_productos
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    WHERE 1=1
  `
  const params = []
  if (obra_id) { sql += ' AND r.obra_id = ?'; params.push(obra_id) }
  sql += ' ORDER BY r.id DESC'
  return db.prepare(sql).all(...params)
}

export const getRecepcionById = (id) => {
  const header = db.prepare(`
    SELECT r.*, o.nombre as obra_nombre
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    WHERE r.id = ?
  `).get(id)

  if (!header) return null

  const detalles = db.prepare(`
    SELECT rd.*, p.folio as pedido_folio,
           co.nombre as catalogo_nombre, co.codigo as catalogo_codigo,
           co.precio_referencia as precio_estimado, co.unidad as catalogo_unidad
    FROM recepcion_detalles rd
    LEFT JOIN pedidos p ON p.id = rd.pedido_id
    LEFT JOIN catalogo_obras co ON co.id = rd.catalogo_obra_id
    WHERE rd.recepcion_id = ?
  `).all(id)

  return { ...header, items: detalles }
}

export const getRecepcionesPendientes = () => {
  const headers = db.prepare(`
    SELECT r.*, o.nombre as obra_nombre,
           (SELECT COUNT(*) FROM recepcion_detalles WHERE recepcion_id = r.id) as total_items,
           (SELECT GROUP_CONCAT(producto, ', ') FROM recepcion_detalles WHERE recepcion_id = r.id) as resumen_productos
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    WHERE r.id NOT IN (
      SELECT recepcion_id FROM facturas WHERE recepcion_id IS NOT NULL
    )
    ORDER BY r.fecha DESC
  `).all()

  return headers.map(h => {
    const items = db.prepare(`
      SELECT rd.*, co.precio_referencia as precio_estimado
      FROM recepcion_detalles rd
      LEFT JOIN catalogo_obras co ON co.id = rd.catalogo_obra_id
      WHERE rd.recepcion_id = ?
    `).all(h.id)
    return { ...h, items }
  })
}

export const createRecepcion = (datos) => {
  // Convertimos un single en un bulk de 1 para reutilizar lógica
  return createRecepcionBulk([datos])
}

export const createRecepcionBulk = (listaItems) => {
  if (listaItems.length === 0) return null

  return db.transaction(() => {
    const first = listaItems[0]
    const folio = siguienteFolio()
    const fecha = first.fecha || new Date().toISOString().split('T')[0]

    // 1. Crear cabecera
    const infoHeader = db.prepare(`
      INSERT INTO recepciones (folio, obra_id, tipo_flujo, proveedor, entrego, recibio, fecha)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      folio,
      first.obra_id,
      first.tipo_flujo || 'sin_pedido',
      first.proveedor || '',
      first.entrego || '',
      first.recibio || '',
      fecha
    )

    const recepcionId = infoHeader.lastInsertRowid

    // 2. Crear detalles
    const stmtDetalle = db.prepare(`
      INSERT INTO recepcion_detalles (recepcion_id, pedido_id, producto, cantidad_pedida, cantidad_recibida, faltante, catalogo_obra_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    for (const item of listaItems) {
      let cantidad_pedida = 0
      let faltante = 0
      let catalogo_obra_id = item.catalogo_obra_id || null

      if (item.pedido_id) {
        const pedido = db.prepare(`
          SELECT p.* FROM pedidos p WHERE p.id = ?
        `).get(item.pedido_id)

        if (pedido) {
          cantidad_pedida = pedido.cantidad
          faltante = Math.max(0, cantidad_pedida - item.cantidad_recibida)
          if (!catalogo_obra_id) catalogo_obra_id = pedido.catalogo_obra_id

          // Actualizar status del pedido
          const nuevoStatus = faltante > 0 ? 'Parcial' : 'Recibido'
          db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(nuevoStatus, item.pedido_id)
        }
      }

      let producto = item.producto || ''
      if (catalogo_obra_id && !producto) {
        const cat = db.prepare('SELECT nombre FROM catalogo_obras WHERE id = ?').get(catalogo_obra_id)
        if (cat) producto = cat.nombre
      }

      stmtDetalle.run(
        recepcionId,
        item.pedido_id || null,
        producto,
        cantidad_pedida,
        item.cantidad_recibida,
        faltante,
        catalogo_obra_id
      )
    }

    return getRecepcionById(recepcionId)
  })()
}
