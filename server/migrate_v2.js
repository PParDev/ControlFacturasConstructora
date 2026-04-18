/**
 * Migración v2 — Trazabilidad completa del flujo OC → Recepción → Factura
 *
 * Agrega catalogo_obra_id a pedidos y recepciones para que todo el flujo
 * mantenga la referencia al insumo del catálogo, permitiendo auto-poblar
 * los detalles de factura sin depender de coincidencia de texto.
 *
 * Es idempotente: se puede correr más de una vez sin error.
 */

import db from './db.js'

const addColumnIfMissing = (table, column, definition) => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    console.log(`  ✓ Columna añadida: ${table}.${column}`)
  } else {
    console.log(`  · Ya existe:       ${table}.${column}`)
  }
}

console.log('\n── Migración v2 ──────────────────────────────────────')

// Agrega referencia al catálogo en pedidos
addColumnIfMissing('pedidos',     'catalogo_obra_id', 'INTEGER REFERENCES catalogo_obras(id)')

// Agrega referencia al catálogo en recepciones
addColumnIfMissing('recepciones', 'catalogo_obra_id', 'INTEGER REFERENCES catalogo_obras(id)')

console.log('── Migración v2 completada ───────────────────────────\n')
process.exit(0)
