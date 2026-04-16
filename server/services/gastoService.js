import db from '../db.js'

export const getGastos = (obra_id, categoria) => {
  let sql = `
    SELECT g.*, o.nombre as obra_nombre
    FROM gastos g
    LEFT JOIN obras o ON o.id = g.obra_id
    WHERE 1=1
  `
  const params = []
  if (obra_id)   { sql += ' AND g.obra_id = ?';   params.push(obra_id)   }
  if (categoria) { sql += ' AND g.categoria = ?'; params.push(categoria) }
  sql += ' ORDER BY g.fecha DESC, g.id DESC'

  return db.prepare(sql).all(...params)
}

export const createGasto = (datos) => {
  const obra = db.prepare('SELECT id FROM obras WHERE id = ?').get(datos.obra_id)
  if (!obra) throw new Error('Obra no encontrada')

  const fechaFinal = datos.fecha || new Date().toISOString().split('T')[0]
  const cat = datos.categoria || 'Caja chica'

  const gasto = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO gastos (obra_id, categoria, concepto, monto, fecha)
      VALUES (?, ?, ?, ?, ?)
    `).run(datos.obra_id, cat, datos.concepto || '', datos.monto, fechaFinal)

    // Acumula en la obra
    db.prepare('UPDATE obras SET gasto_acumulado = gasto_acumulado + ? WHERE id = ?').run(datos.monto, datos.obra_id)

    return db.prepare('SELECT * FROM gastos WHERE id = ?').get(info.lastInsertRowid)
  })()

  return gasto
}
