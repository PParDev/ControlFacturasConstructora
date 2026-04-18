import db from '../db.js'

export const getCuentas = () => {
  return db.prepare(`SELECT * FROM cuentas_bancarias ORDER BY nombre ASC`).all()
}

export const createCuenta = (datos) => {
  const info = db.prepare(`
    INSERT INTO cuentas_bancarias (nombre, tipo, saldo_inicial, saldo_actual, obra_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(datos.nombre, datos.tipo, datos.saldo_inicial, datos.saldo_inicial, datos.obra_id || null)

  return db.prepare('SELECT * FROM cuentas_bancarias WHERE id = ?').get(info.lastInsertRowid)
}

export const getTransacciones = (cuentaId) => {
  return db.prepare(`
    SELECT t.*, o.nombre as obra_nombre
    FROM transacciones t
    LEFT JOIN obras o ON o.id = t.obra_id
    WHERE t.cuenta_id = ?
    ORDER BY t.fecha DESC, t.id DESC
  `).all(cuentaId)
}

export const createTransaccion = (datos) => {
  return db.transaction(() => {
    // 1. Insert transaction
    const fechaFinal = datos.fecha || new Date().toISOString().split('T')[0]
    const info = db.prepare(`
      INSERT INTO transacciones (cuenta_id, fecha, tipo, monto, concepto, beneficiario, obra_id, categoria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(datos.cuenta_id, fechaFinal, datos.tipo, datos.monto, datos.concepto || '', datos.beneficiario || '', datos.obra_id || null, datos.categoria || 'General')

    // 2. Recalculate account balance based on all transactions
    const cuenta = db.prepare('SELECT saldo_inicial, tipo FROM cuentas_bancarias WHERE id = ?').get(datos.cuenta_id)
    const trans = db.prepare('SELECT sum(monto) as total FROM transacciones WHERE cuenta_id = ? AND tipo = ?')
    
    const cargos = trans.get(datos.cuenta_id, 'Cargo').total || 0
    const abonos = trans.get(datos.cuenta_id, 'Abono').total || 0
    
    // For fiscal/cajachica, abonos increase balance, cargos decrease.
    // For credit, cargos increase debt, abonos decrease debt.
    let saldoActual = cuenta.saldo_inicial
    if (cuenta.tipo === 'Crédito') {
      saldoActual = cuenta.saldo_inicial + cargos - abonos
    } else {
      saldoActual = cuenta.saldo_inicial + abonos - cargos
    }

    db.prepare('UPDATE cuentas_bancarias SET saldo_actual = ? WHERE id = ?').run(saldoActual, datos.cuenta_id)

    return db.prepare('SELECT * FROM transacciones WHERE id = ?').get(info.lastInsertRowid)
  })()
}

export const getResumen = () => {
  const cuentas = getCuentas()
  const sumaBancos = cuentas.filter(c => c.tipo !== 'Crédito').reduce((acc, c) => acc + c.saldo_actual, 0)
  const sumaCreditos = cuentas.filter(c => c.tipo === 'Crédito').reduce((acc, c) => acc + c.saldo_actual, 0)
  
  return {
    saldo_cheques: sumaBancos,
    deuda_credito: sumaCreditos
  }
}

export const updateSaldoInicial = (id, saldo_inicial) => {
  return db.transaction(() => {
    // Update initial balance
    db.prepare('UPDATE cuentas_bancarias SET saldo_inicial = ? WHERE id = ?').run(saldo_inicial, id)
    
    // Recalculate balance
    const cuenta = db.prepare('SELECT saldo_inicial, tipo FROM cuentas_bancarias WHERE id = ?').get(id)
    const trans = db.prepare('SELECT sum(monto) as total FROM transacciones WHERE cuenta_id = ? AND tipo = ?')
    
    const cargos = trans.get(id, 'Cargo').total || 0
    const abonos = trans.get(id, 'Abono').total || 0
    
    let saldoActual = cuenta.saldo_inicial
    if (cuenta.tipo === 'Crédito') {
      saldoActual = cuenta.saldo_inicial + cargos - abonos
    } else {
      saldoActual = cuenta.saldo_inicial + abonos - cargos
    }

    db.prepare('UPDATE cuentas_bancarias SET saldo_actual = ? WHERE id = ?').run(saldoActual, id)
    
    return db.prepare('SELECT * FROM cuentas_bancarias WHERE id = ?').get(id)
  })()
}
