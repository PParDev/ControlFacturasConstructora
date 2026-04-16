import db from '../db.js'

export const getObras = () => {
  return db.prepare('SELECT * FROM obras ORDER BY id DESC').all()
}

export const getObraById = (id) => {
  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(id)
  if (!obra) throw new Error('Obra no encontrada')

  const gastos      = db.prepare('SELECT * FROM gastos WHERE obra_id = ? ORDER BY fecha DESC').all(obra.id)
  const facturas    = db.prepare('SELECT * FROM facturas WHERE obra_id = ?').all(obra.id)
  const pedidos     = db.prepare('SELECT * FROM pedidos WHERE obra_id = ?').all(obra.id)
  const recepciones = db.prepare('SELECT * FROM recepciones WHERE obra_id = ?').all(obra.id)

  return { ...obra, gastos, facturas, pedidos, recepciones }
}

export const createObra = (datos) => {
  const info = db.prepare(`
    INSERT INTO obras (nombre, cliente, ubicacion, fecha_inicio, fecha_cierre, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(datos.nombre, datos.cliente || '', datos.ubicacion || '', datos.fecha_inicio || '', datos.fecha_cierre || '', datos.status || 'Activa')

  return db.prepare('SELECT * FROM obras WHERE id = ?').get(info.lastInsertRowid)
}

export const updateObra = (id, datos) => {
  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(id)
  if (!obra) throw new Error('Obra no encontrada')

  db.prepare(`
    UPDATE obras SET
      nombre       = COALESCE(?, nombre),
      cliente      = COALESCE(?, cliente),
      ubicacion    = COALESCE(?, ubicacion),
      fecha_inicio = COALESCE(?, fecha_inicio),
      fecha_cierre = COALESCE(?, fecha_cierre),
      status       = COALESCE(?, status)
    WHERE id = ?
  `).run(datos.nombre, datos.cliente, datos.ubicacion, datos.fecha_inicio, datos.fecha_cierre, datos.status, id)

  return db.prepare('SELECT * FROM obras WHERE id = ?').get(id)
}

export const deleteObra = (id) => {
  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(id)
  if (!obra) throw new Error('Obra no encontrada')
  db.prepare("UPDATE obras SET status = 'Archivada' WHERE id = ?").run(id)
  return { ok: true }
}
