import db from '../db.js'

function siguienteFolio() {
  const row = db.prepare(`
    SELECT MAX(CAST(REPLACE(folio,'OC-','') AS INTEGER)) as max_n FROM pedidos
  `).get()
  const n = (row.max_n || 0) + 1
  return `OC-${String(n).padStart(3, '0')}`
}

export const getPedidos = (obra_id, status) => {
  let sql = `
    SELECT p.*, o.nombre as obra_nombre
    FROM pedidos p
    LEFT JOIN obras o ON o.id = p.obra_id
    WHERE 1=1
  `
  const params = []
  if (obra_id) { sql += ' AND p.obra_id = ?'; params.push(obra_id) }
  if (status)  { sql += ' AND p.status = ?';  params.push(status)  }
  sql += ' ORDER BY p.id DESC'

  return db.prepare(sql).all(...params)
}

export const createPedido = (datos) => {
  const obra = db.prepare('SELECT id FROM obras WHERE id = ?').get(datos.obra_id)
  if (!obra) throw new Error('Obra no encontrada')

  const folio = siguienteFolio()
  const fechaFinal = datos.fecha || new Date().toISOString().split('T')[0]

  const info = db.prepare(`
    INSERT INTO pedidos (folio, obra_id, proveedor, producto, cantidad, unidad, notas, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(folio, datos.obra_id, datos.proveedor || '', datos.producto || '', datos.cantidad, datos.unidad || '', datos.notas || '', fechaFinal)

  return db.prepare('SELECT * FROM pedidos WHERE id = ?').get(info.lastInsertRowid)
}

export const createPedidosBulk = (listaDatos) => {
  if (listaDatos.length === 0) return []
  
  const obraId = listaDatos[0].obra_id
  const obra = db.prepare('SELECT id FROM obras WHERE id = ?').get(obraId)
  if (!obra) throw new Error('Obra no encontrada')

  const folio = siguienteFolio()
  
  return db.transaction(() => {
    const insert = db.prepare(`
      INSERT INTO pedidos (folio, obra_id, proveedor, producto, cantidad, unidad, notas, fecha)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const ids = []
    for (const datos of listaDatos) {
      const fechaFinal = datos.fecha || new Date().toISOString().split('T')[0]
      const info = insert.run(folio, datos.obra_id, datos.proveedor || '', datos.producto || '', datos.cantidad, datos.unidad || '', datos.notas || '', fechaFinal)
      ids.push(info.lastInsertRowid)
    }
    
    const placeholders = ids.map(() => '?').join(',')
    return db.prepare(`SELECT * FROM pedidos WHERE id IN (${placeholders})`).all(...ids)
  })()
}

export const updatePedido = (id, datos) => {
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id)
  if (!pedido) throw new Error('Pedido no encontrado')

  db.prepare(`
    UPDATE pedidos SET
      status    = COALESCE(?, status),
      proveedor = COALESCE(?, proveedor),
      producto  = COALESCE(?, producto),
      cantidad  = COALESCE(?, cantidad),
      notas     = COALESCE(?, notas)
    WHERE id = ?
  `).run(datos.status, datos.proveedor, datos.producto, datos.cantidad, datos.notas, id)

  return db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id)
}
