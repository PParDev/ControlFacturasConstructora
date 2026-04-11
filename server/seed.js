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

  // ── Catálogo de productos ────────────────────────────────────
  const catCount = db.prepare('SELECT COUNT(*) as n FROM catalogo_productos').get().n
  if (catCount === 0) {
    const ins = db.prepare(`
      INSERT INTO catalogo_productos (codigo, nombre, descripcion, unidad, categoria, precio_referencia, proveedor_habitual, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    ins.run('P-001', 'Varilla 3/8',  'Varilla corrugada de 3/8"',        'pieza',  'acero',     45,  'El Toro',          'Activo')
    ins.run('P-002', 'Block 15×20',  'Block de concreto 15×20×40',       'pieza',  'block',     8.5, 'Cementos Nayar',   'Activo')
    ins.run('P-003', 'Arena m³',     'Arena gruesa para construcción',   'm³',     'agregados', 280, 'Materiales Nayar', 'Activo')
    ins.run('P-004', 'Alambrón',     'Alambrón recocido',                'kg',     'acero',     32,  'El Toro',          'Activo')
    ins.run('P-005', 'Cemento 50kg', 'Cemento Portland bolsa 50 kg',    'costal', 'concreto',  185, 'Cementos Nayar',   'Activo')
    ins.run('P-006', 'Grava m³',     'Grava triturada para mezcla',     'm³',     'agregados', 320, 'Materiales Nayar', 'Inactivo')
    console.log('  → Catálogo: 6 productos insertados')
  } else {
    console.log('  → Catálogo: ya tiene datos, se omite')
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

  // ── Cuenta Cheques ───────────────────────────────────────────
  const chqCount = db.prepare('SELECT COUNT(*) as n FROM mov_cheques').get().n
  if (chqCount === 0) {
    const ins = db.prepare(`
      INSERT INTO mov_cheques (obra_id, fecha, beneficiario, cargo, abono, saldo)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    ins.run(null, '2026-04-01', '—',      0,    100000, 100000)
    ins.run(1,    '2026-04-05', 'El Toro', 5000, 0,      95000)
    console.log('  → Cheques: 2 movimientos insertados')
  } else {
    console.log('  → Cheques: ya tiene datos, se omite')
  }

  // ── Tarjeta Crédito ──────────────────────────────────────────
  const crdCount = db.prepare('SELECT COUNT(*) as n FROM mov_credito').get().n
  if (crdCount === 0) {
    const ins = db.prepare(`
      INSERT INTO mov_credito (obra_id, fecha, beneficiario, cargo, abono, saldo)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    ins.run(1, '2026-03-10', 'Ferretería Central', 8400,  0, 8400)
    ins.run(2, '2026-03-14', 'Materiales Nayar',   10000, 0, 18400)
    console.log('  → Crédito: 2 movimientos insertados')
  } else {
    console.log('  → Crédito: ya tiene datos, se omite')
  }

})

console.log('🌱 Iniciando seed...')
seed()
console.log('✅ Seed completado.')
process.exit(0)
