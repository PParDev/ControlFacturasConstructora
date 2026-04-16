import db from './db.js'

/**
 * Llena la BD con los datos de ejemplo del mockData del frontend.
 * Solo inserta si la tabla está vacía.
 */

const seed = db.transaction(() => {

  // ── Obras ──────────────────────────────────────────────────
  const obraCount = db.prepare('SELECT COUNT(*) as n FROM obras').get().n
  if (obraCount === 0) {
    const ins = db.prepare(`
      INSERT INTO obras (nombre, cliente, ubicacion, fecha_inicio, fecha_cierre, status, gasto_acumulado)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    ins.run('Residencial Houston', 'Familia Martínez', 'Col. Las Quintas, Tepic', '2026-01-10', '2026-06-30', 'Activa',    54200)
    ins.run('Tulipán 234',         'Inmobiliaria Nayar', 'Col. Las Flores, Tepic','2026-02-15', '2026-08-15', 'Activa',    38000)
    ins.run('Pedregal Norte',      'Constructora Pacífico','Fracc. Pedregal, Tepic','2026-01-05','2026-07-01','En pausa',  22000)
    ins.run('Vista Hermosa',       'Familia Ruiz',       'Col. Vista Hermosa, Tepic','2025-10-01','2026-01-20','Terminada',10000)
    console.log('  → Obras: 4 registros insertados')
  } else {
    console.log('  → Obras: ya tiene datos, se omite')
  }

  // ── Catálogos por obra ───────────────────────────────────────
  const catCount = db.prepare('SELECT COUNT(*) as n FROM catalogo_obras').get().n
  if (catCount === 0) {
    const ins = db.prepare(`
      INSERT INTO catalogo_obras (obra_id, codigo, nombre, unidad, cantidad_presupuestada, precio_referencia, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    // Obra 1
    ins.run(1, 'P-001', 'Varilla 3/8',  'pieza', 1000, 45, 'Activo')
    ins.run(1, 'P-002', 'Block 15×20',  'pieza', 5000, 8.5,'Activo')
    ins.run(1, 'P-003', 'Arena m³',     'm³',    200, 280, 'Activo')
    // Obra 2
    ins.run(2, 'P-001', 'Varilla 3/8',  'pieza', 500,  45, 'Activo')
    ins.run(2, 'P-003', 'Arena m³',     'm³',    100,  280,'Activo')
    console.log('  → Catálogo de obras: 5 productos insertados')
  } else {
    console.log('  → Catálogo de obras: ya tiene datos, se omite')
  }


  // ── Pedidos ──────────────────────────────────────────────────
  const pedCount = db.prepare('SELECT COUNT(*) as n FROM pedidos').get().n
  if (pedCount === 0) {
    const ins = db.prepare(`
      INSERT INTO pedidos (folio, obra_id, proveedor, producto, cantidad, unidad, fecha, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    ins.run('OC-040', 3, 'Materiales Nayar', 'Arena',      1,   'm³',  '2026-03-15', 'Pendiente')
    ins.run('OC-041', 1, 'El Toro',          'Varilla 3/8', 100, 'pzas','2026-03-18', 'Recibido')
    ins.run('OC-042', 2, 'Cementos Nayar',   'Blocks 15×20',500, 'pzas','2026-03-20', 'Recibido')
    console.log('  → Pedidos: 3 registros insertados')
  } else {
    console.log('  → Pedidos: ya tiene datos, se omite')
  }

  // ── Recepciones ──────────────────────────────────────────────
  const recCount = db.prepare('SELECT COUNT(*) as n FROM recepciones').get().n
  if (recCount === 0) {
    const ins = db.prepare(`
      INSERT INTO recepciones (folio, obra_id, pedido_id, tipo_flujo, proveedor, producto, cantidad_pedida, cantidad_recibida, faltante, entrego, recibio, fecha)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    ins.run('REC-016', 1, 2, 'con_pedido', 'El Toro',        'Alambrón',    0,   45,  0, 'Chofer Toro',    'Encargado Obra', '2026-03-12')
    ins.run('REC-017', 1, 2, 'con_pedido', 'El Toro',        'Varilla 3/8', 100, 100, 0, 'Chofer Toro',    'Encargado Obra', '2026-03-15')
    ins.run('REC-018', 2, 3, 'con_pedido', 'Cementos Nayar', 'Blocks 15×20',500, 480, 20,'Chofer Nayar',   'Encargado Obra', '2026-03-18')
    console.log('  → Recepciones: 3 registros insertados')
  } else {
    console.log('  → Recepciones: ya tiene datos, se omite')
  }

  // ── Facturas ─────────────────────────────────────────────────
  const facCount = db.prepare('SELECT COUNT(*) as n FROM facturas').get().n
  if (facCount === 0) {
    const ins = db.prepare(`
      INSERT INTO facturas (folio, obra_id, recepcion_id, proveedor, monto, fecha, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    ins.run('FAC-0889', 1, 2, 'El Toro',        12000, '2026-03-15', 'Pagada')
    ins.run('FAC-0890', 2, 3, 'Cementos Nayar', 22400, '2026-03-20', 'Pendiente')
    ins.run('FAC-0891', 3, null,'El Toro',       14100, '2026-03-22', 'Pendiente')
    console.log('  → Facturas: 3 registros insertados')
  } else {
    console.log('  → Facturas: ya tiene datos, se omite')
  }

  // ── Pagos ────────────────────────────────────────────────────
  const pagCount = db.prepare('SELECT COUNT(*) as n FROM pagos').get().n
  if (pagCount === 0) {
    db.prepare(`
      INSERT INTO pagos (factura_id, monto, forma_pago, referencia, fecha, status)
      VALUES (1, 12000, 'Transferencia', 'REF-001', '2026-03-15', 'Pagado')
    `).run()
    console.log('  → Pagos: 1 registro insertado')
  } else {
    console.log('  → Pagos: ya tiene datos, se omite')
  }

  // ── Gastos ───────────────────────────────────────────────────
  const gasCount = db.prepare('SELECT COUNT(*) as n FROM gastos').get().n
  if (gasCount === 0) {
    const ins = db.prepare(`
      INSERT INTO gastos (obra_id, categoria, concepto, monto, fecha)
      VALUES (?, ?, ?, ?, ?)
    `)
    ins.run(1, 'Material',     'Varilla corrugada', 12000, '2026-03-19')
    ins.run(2, 'Mano de obra', 'Cuadrilla semana',   8000, '2026-03-18')
    ins.run(1, 'Caja chica',   'Transporte',          1200, '2026-03-17')
    ins.run(3, 'Material',     'Blocks y arena',     22000, '2026-03-16')
    console.log('  → Gastos: 4 registros insertados')
  } else {
    console.log('  → Gastos: ya tiene datos, se omite')
  }

  // ── Cuentas Bancarias ─────────────────────────────────────────
  const ctaCount = db.prepare('SELECT COUNT(*) as n FROM cuentas_bancarias').get().n
  if (ctaCount === 0) {
    const ins = db.prepare(`
      INSERT INTO cuentas_bancarias (nombre, tipo, saldo_inicial, saldo_actual, obra_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    ins.run('Banamex Fiscal', 'Fiscal', 100000, 95000, null)
    ins.run('Tarjeta Bancomer', 'Crédito', 0, 18400, null) 
    ins.run('Caja Chica Proyecto 1', 'Caja Chica', 5000, 3800, 1)
    console.log('  → Cuentas Bancarias: 3 insertadas')
  } else {
    console.log('  → Cuentas Bancarias: ya tiene datos, se omite')
  }

  // ── Transacciones ─────────────────────────────────────────────
  const transCount = db.prepare('SELECT COUNT(*) as n FROM transacciones').get().n
  if (transCount === 0) {
    const ins = db.prepare(`
      INSERT INTO transacciones (cuenta_id, fecha, tipo, monto, concepto, beneficiario, obra_id, categoria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    // Cuenta 1 (Fiscal)
    ins.run(1, '2026-04-05', 'Cargo', 5000, 'Materiales varilla', 'El Toro', 1, 'Materiales')
    // Cuenta 2 (Crédito)
    ins.run(2, '2026-03-10', 'Cargo', 8400, 'Herramientas', 'Ferretería Central', 1, 'Generales')
    ins.run(2, '2026-03-14', 'Cargo', 10000,'Flete', 'Materiales Nayar', 2, 'Fletes')
    // Cuenta 3 (Caja Chica 1)
    ins.run(3, '2026-03-17', 'Cargo', 1200, 'Transporte', 'Taxis Local', 1, 'Viáticos')
    console.log('  → Transacciones: 4 insertadas')
  } else {
    console.log('  → Transacciones: ya tiene datos, se omite')
  }

})

console.log('🌱 Iniciando seed...')
seed()
console.log('✅ Seed completado.')
process.exit(0)
