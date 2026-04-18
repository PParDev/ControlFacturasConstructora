import db from './db.js'

try {
  db.transaction(() => {
    console.log('Limpiando transacciones...')
    db.prepare('DELETE FROM transacciones').run()
    console.log('Limpiando gastos...')
    db.prepare('DELETE FROM gastos').run()
    console.log('Limpiando pagos...')
    db.prepare('DELETE FROM pagos').run()
    console.log('Limpiando facturas...')
    db.prepare('DELETE FROM facturas').run()
    console.log('Limpiando recepciones...')
    db.prepare('DELETE FROM recepciones').run()
    console.log('Limpiando pedidos...')
    db.prepare('DELETE FROM pedidos').run()
    console.log('Limpiando catalogo de obras...')
    db.prepare('DELETE FROM catalogo_obras').run()
    console.log('Limpiando obras...')
    db.prepare('DELETE FROM obras').run()
    
    console.log('Reseteando saldos de cuentas...')
    db.prepare('UPDATE cuentas_bancarias SET saldo_actual = saldo_inicial').run()
  })()
  console.log('✅ Base de datos limpiada exitosamente.')
} catch (error) {
  console.error('❌ Error limpiando base de datos:', error)
}
