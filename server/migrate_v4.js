/**
 * Migración v4 — Índices de rendimiento
 *
 * Agrega índices en las columnas más consultadas (llaves foráneas,
 * filtros de status, filtros de fecha) para acelerar todas las
 * consultas de listados y reportes.
 *
 * Es idempotente: usa CREATE INDEX IF NOT EXISTS.
 */

import db from './db.js'

const crearIndice = (nombre, sql) => {
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS ${nombre} ${sql}`)
    console.log(`  ✓ Índice: ${nombre}`)
  } catch (e) {
    console.log(`  · Ya existe o error: ${nombre} — ${e.message}`)
  }
}

console.log('\n── Migración v4 — Índices ────────────────────────────')

// ── Pedidos ──────────────────────────────────────────────────
crearIndice('idx_pedidos_obra_id',         'ON pedidos(obra_id)')
crearIndice('idx_pedidos_status',          'ON pedidos(status)')
crearIndice('idx_pedidos_catalogo_obra_id','ON pedidos(catalogo_obra_id)')

// ── Recepciones ──────────────────────────────────────────────
crearIndice('idx_recepciones_obra_id',        'ON recepciones(obra_id)')
crearIndice('idx_recepciones_pedido_id',      'ON recepciones(pedido_id)')
crearIndice('idx_recepciones_catalogo_obra_id','ON recepciones(catalogo_obra_id)')

// ── Facturas ──────────────────────────────────────────────────
crearIndice('idx_facturas_obra_id',      'ON facturas(obra_id)')
crearIndice('idx_facturas_status',       'ON facturas(status)')
crearIndice('idx_facturas_recepcion_id', 'ON facturas(recepcion_id)')
crearIndice('idx_facturas_fecha',        'ON facturas(fecha)')

// ── Detalles de factura ───────────────────────────────────────
crearIndice('idx_detalles_factura_factura_id',      'ON detalles_factura(factura_id)')
crearIndice('idx_detalles_factura_catalogo_obra_id','ON detalles_factura(catalogo_obra_id)')

// ── Gastos ────────────────────────────────────────────────────
crearIndice('idx_gastos_obra_id',   'ON gastos(obra_id)')
crearIndice('idx_gastos_categoria', 'ON gastos(categoria)')
crearIndice('idx_gastos_fecha',     'ON gastos(fecha)')

// ── Pagos ─────────────────────────────────────────────────────
crearIndice('idx_pagos_factura_id', 'ON pagos(factura_id)')

// ── Transacciones bancarias ───────────────────────────────────
crearIndice('idx_transacciones_cuenta_id', 'ON transacciones(cuenta_id)')
crearIndice('idx_transacciones_fecha',     'ON transacciones(fecha)')
crearIndice('idx_transacciones_obra_id',   'ON transacciones(obra_id)')

// ── Catálogo de obras ─────────────────────────────────────────
crearIndice('idx_catalogo_obras_obra_id', 'ON catalogo_obras(obra_id)')

// ── Historial de precios ──────────────────────────────────────
crearIndice('idx_historial_precios_catalogo_obra_id', 'ON historial_precios(catalogo_obra_id)')

console.log('── Migración v4 completada ───────────────────────────\n')
process.exit(0)
