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
    SELECT r.*, o.nombre as obra_nombre, p.folio as pedido_folio
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    LEFT JOIN pedidos p ON p.id = r.pedido_id
    WHERE 1=1
  `
  const params = []
  if (obra_id) { sql += ' AND r.obra_id = ?'; params.push(obra_id) }
  sql += ' ORDER BY r.id DESC'

  return db.prepare(sql).all(...params)
}

export const getRecepcionesPendientes = () => {
  return db.prepare(`
    SELECT r.*, o.nombre as obra_nombre
    FROM recepciones r
    LEFT JOIN obras o ON o.id = r.obra_id
    WHERE r.id NOT IN (SELECT recepcion_id FROM facturas WHERE recepcion_id IS NOT NULL)
    ORDER BY r.fecha DESC
  `).all()
}

export const createRecepcion = (datos) => {
  let cantidad_pedida = 0
  let faltante = 0

  if (datos.pedido_id) {
    const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(datos.pedido_id)
    if (!pedido) throw new Error('Pedido no encontrado')
    cantidad_pedida = pedido.cantidad
    faltante        = Math.max(0, cantidad_pedida - datos.cantidad_recibida)

    const nuevoStatus = faltante > 0 ? 'Parcial' : 'Recibido'
    db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(nuevoStatus, datos.pedido_id)
  }

  const folio      = siguienteFolio()
  const fechaFinal = datos.fecha || new Date().toISOString().split('T')[0]

  const info = db.prepare(`
    INSERT INTO recepciones
      (folio, obra_id, pedido_id, tipo_flujo, proveedor, producto,
       cantidad_pedida, cantidad_recibida, faltante, entrego, recibio, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(folio, datos.obra_id, datos.pedido_id || null, datos.tipo_flujo || 'sin_pedido', datos.proveedor || '', datos.producto || '',
         cantidad_pedida, datos.cantidad_recibida, faltante, datos.entrego || '', datos.recibio || '', fechaFinal)

  return db.prepare('SELECT * FROM recepciones WHERE id = ?').get(info.lastInsertRowid)
}
