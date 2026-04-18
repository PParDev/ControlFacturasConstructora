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
    SELECT r.*, o.nombre as obra_nombre, p.folio as pedido_folio,
           co.nombre as catalogo_nombre, co.codigo as catalogo_codigo
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    LEFT JOIN pedidos p ON p.id = r.pedido_id
    LEFT JOIN catalogo_obras co ON co.id = r.catalogo_obra_id
    WHERE 1=1
  `
  const params = []
  if (obra_id) { sql += ' AND r.obra_id = ?'; params.push(obra_id) }
  sql += ' ORDER BY r.id DESC'
  return db.prepare(sql).all(...params)
}

export const getRecepcionById = (id) => {
  return db.prepare(`
    SELECT r.*, o.nombre as obra_nombre, p.folio as pedido_folio,
           co.nombre as catalogo_nombre, co.codigo as catalogo_codigo,
           co.precio_referencia as precio_estimado, co.unidad as catalogo_unidad
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    LEFT JOIN pedidos p ON p.id = r.pedido_id
    LEFT JOIN catalogo_obras co ON co.id = r.catalogo_obra_id
    WHERE r.id = ?
  `).get(id)
}

export const getRecepcionesPendientes = () => {
  return db.prepare(`
    SELECT r.*, o.nombre as obra_nombre,
           co.nombre as catalogo_nombre, co.codigo as catalogo_codigo
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    LEFT JOIN catalogo_obras co ON co.id = r.catalogo_obra_id
    WHERE r.folio NOT IN (
      SELECT r2.folio FROM facturas f 
      JOIN recepciones r2 ON f.recepcion_id = r2.id 
      WHERE f.recepcion_id IS NOT NULL
    )
    ORDER BY r.fecha DESC
  `).all()
}

export const createRecepcion = (datos) => {
  return db.transaction(() => {
    let cantidad_pedida  = 0
    let faltante         = 0
    let catalogo_obra_id = datos.catalogo_obra_id || null

    if (datos.pedido_id) {
      const pedido = db.prepare(`
        SELECT p.*, co.precio_referencia
        FROM pedidos p
        LEFT JOIN catalogo_obras co ON co.id = p.catalogo_obra_id
        WHERE p.id = ?
      `).get(datos.pedido_id)

      if (!pedido) throw new Error('Pedido no encontrado')

      cantidad_pedida = pedido.cantidad
      faltante        = Math.max(0, cantidad_pedida - datos.cantidad_recibida)

      // Heredar catalogo_obra_id del pedido si no viene explícito en los datos
      if (!catalogo_obra_id && pedido.catalogo_obra_id) {
        catalogo_obra_id = pedido.catalogo_obra_id
      }

      const nuevoStatus = faltante > 0 ? 'Parcial' : 'Recibido'
      db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(nuevoStatus, datos.pedido_id)
    }

    // El folio se genera dentro de la transacción para evitar duplicados
    const folio      = siguienteFolio()
    const fechaFinal = datos.fecha || new Date().toISOString().split('T')[0]

    // Si hay catalogo_obra_id pero no producto, tomar nombre del catálogo
    let producto = datos.producto || ''
    if (catalogo_obra_id && !producto) {
      const cat = db.prepare('SELECT nombre FROM catalogo_obras WHERE id = ?').get(catalogo_obra_id)
      if (cat) producto = cat.nombre
    }

    const info = db.prepare(`
      INSERT INTO recepciones
        (folio, obra_id, pedido_id, tipo_flujo, proveedor, producto,
         cantidad_pedida, cantidad_recibida, faltante, entrego, recibio, fecha, catalogo_obra_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      folio, datos.obra_id, datos.pedido_id || null,
      datos.tipo_flujo || 'sin_pedido',
      datos.proveedor  || '', producto,
      cantidad_pedida, datos.cantidad_recibida, faltante,
      datos.entrego    || '', datos.recibio || '',
      fechaFinal, catalogo_obra_id
    )

    return db.prepare(`
      SELECT r.*, co.nombre as catalogo_nombre, co.precio_referencia as precio_estimado
      FROM recepciones r
      LEFT JOIN catalogo_obras co ON co.id = r.catalogo_obra_id
      WHERE r.id = ?
    `).get(info.lastInsertRowid)
  })()
}

export const createRecepcionBulk = (listaDatos) => {
  if (listaDatos.length === 0) return []

  return db.transaction(() => {
    // Generar un solo folio para todos los elementos recibidos juntos
    const folio      = siguienteFolio()
    const fechaFinal = listaDatos[0]?.fecha || new Date().toISOString().split('T')[0]
    const ids = []

    for (const datos of listaDatos) {
      let cantidad_pedida  = 0
      let faltante         = 0
      let catalogo_obra_id = datos.catalogo_obra_id || null

      if (datos.pedido_id) {
        const pedido = db.prepare(`
          SELECT p.*, co.precio_referencia
          FROM pedidos p
          LEFT JOIN catalogo_obras co ON co.id = p.catalogo_obra_id
          WHERE p.id = ?
        `).get(datos.pedido_id)

        if (!pedido) throw new Error(`Pedido ID ${datos.pedido_id} no encontrado`)

        cantidad_pedida = pedido.cantidad
        faltante        = Math.max(0, cantidad_pedida - datos.cantidad_recibida)

        // Heredar catalogo_obra_id del pedido si no viene explícito
        if (!catalogo_obra_id && pedido.catalogo_obra_id) {
          catalogo_obra_id = pedido.catalogo_obra_id
        }

        const nuevoStatus = faltante > 0 ? 'Parcial' : 'Recibido'
        db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(nuevoStatus, datos.pedido_id)
      }

      // Si hay catalogo_obra_id pero no producto, tomar nombre del catálogo
      let producto = datos.producto || ''
      if (catalogo_obra_id && !producto) {
        const cat = db.prepare('SELECT nombre FROM catalogo_obras WHERE id = ?').get(catalogo_obra_id)
        if (cat) producto = cat.nombre
      }

      const info = db.prepare(`
        INSERT INTO recepciones
          (folio, obra_id, pedido_id, tipo_flujo, proveedor, producto,
           cantidad_pedida, cantidad_recibida, faltante, entrego, recibio, fecha, catalogo_obra_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        folio, datos.obra_id, datos.pedido_id || null,
        datos.tipo_flujo || 'sin_pedido',
        datos.proveedor  || '', producto,
        cantidad_pedida, datos.cantidad_recibida, faltante,
        datos.entrego    || '', datos.recibio || '',
        datos.fecha || fechaFinal, catalogo_obra_id
      )
      ids.push(info.lastInsertRowid)
    }

    const placeholders = ids.map(() => '?').join(',')
    return db.prepare(`
      SELECT r.*, co.nombre as catalogo_nombre, co.precio_referencia as precio_estimado
      FROM recepciones r
      LEFT JOIN catalogo_obras co ON co.id = r.catalogo_obra_id
      WHERE r.id IN (${placeholders})
    `).all(...ids)
  })()
}
