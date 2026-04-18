import db from '../db.js'

export const getGastos = (obra_id) => {
  let sql = `
    SELECT g.*, o.nombre as obra_nombre
    FROM gastos g
    LEFT JOIN obras o ON o.id = g.obra_id
    WHERE 1=1
  `
  const params = []
  if (obra_id) { sql += ' AND g.obra_id = ?'; params.push(obra_id) }
  sql += ' ORDER BY g.fecha DESC, g.id DESC'

  return db.prepare(sql).all(...params)
}

export const createGasto = (datos) => {
  const obra = db.prepare('SELECT id FROM obras WHERE id = ?').get(datos.obra_id)
  if (!obra) throw new Error('Obra no encontrada')

  const fechaFinal  = datos.fecha     || new Date().toISOString().split('T')[0]
  const categoriaFinal = datos.categoria || 'Caja chica'

  return db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO gastos (obra_id, categoria, concepto, monto, fecha)
      VALUES (?, ?, ?, ?, ?)
    `).run(datos.obra_id, categoriaFinal, datos.concepto || '', datos.monto, fechaFinal)

    db.prepare('UPDATE obras SET gasto_acumulado = gasto_acumulado + ? WHERE id = ?').run(datos.monto, datos.obra_id)

    if (datos.cuenta_id) {
      const concepto = `${categoriaFinal} — ${datos.concepto || ''}`
      db.prepare(`
        INSERT INTO transacciones (cuenta_id, tipo, monto, concepto, beneficiario, obra_id, fecha)
        VALUES (?, 'Cargo', ?, ?, '', ?, ?)
      `).run(datos.cuenta_id, datos.monto, concepto, datos.obra_id, fechaFinal)

      const cuenta = db.prepare('SELECT saldo_inicial, tipo FROM cuentas_bancarias WHERE id = ?').get(datos.cuenta_id)
      const trans  = db.prepare('SELECT sum(monto) as total FROM transacciones WHERE cuenta_id = ? AND tipo = ?')
      const cargos = trans.get(datos.cuenta_id, 'Cargo').total || 0
      const abonos = trans.get(datos.cuenta_id, 'Abono').total || 0
      const saldo  = cuenta.tipo === 'Crédito'
        ? cuenta.saldo_inicial + cargos - abonos
        : cuenta.saldo_inicial + abonos - cargos
      db.prepare('UPDATE cuentas_bancarias SET saldo_actual = ? WHERE id = ?').run(saldo, datos.cuenta_id)
    }

    return db.prepare('SELECT * FROM gastos WHERE id = ?').get(info.lastInsertRowid)
  })()
}
