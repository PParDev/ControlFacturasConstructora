import db from './db.js'
db.transaction(() => {
  db.prepare('DELETE FROM transacciones').run()
  db.prepare('DELETE FROM cuentas_bancarias').run()
  db.prepare("INSERT INTO cuentas_bancarias (nombre, tipo, saldo_inicial, saldo_actual, obra_id) VALUES ('Cheques', 'Cheques', 0, 0, NULL)").run()
  db.prepare("INSERT INTO cuentas_bancarias (nombre, tipo, saldo_inicial, saldo_actual, obra_id) VALUES ('Crédito', 'Crédito', 0, 0, NULL)").run()
})()
console.log('Fixed cuentas_bancarias')
