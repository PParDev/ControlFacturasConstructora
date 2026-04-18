/**
 * Migración v3 — Historial de precios del catálogo
 *
 * Crea la tabla catalogo_historial_precios para registrar cambios de precio
 * cuando se reimporta un Excel. Así se preserva la historia de estimados
 * originales vs actualizaciones posteriores.
 *
 * Es idempotente: usa CREATE TABLE IF NOT EXISTS.
 */

import db from './db.js'

console.log('\n── Migración v3 ──────────────────────────────────────')

db.exec(`
  CREATE TABLE IF NOT EXISTS catalogo_historial_precios (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    catalogo_obra_id   INTEGER NOT NULL REFERENCES catalogo_obras(id),
    precio_anterior    REAL    NOT NULL,
    precio_nuevo       REAL    NOT NULL,
    cantidad_anterior  REAL,
    cantidad_nueva     REAL,
    fecha              TEXT    NOT NULL,
    motivo             TEXT    DEFAULT 'Reimportación Excel'
  )
`)
console.log('  ✓ Tabla: catalogo_historial_precios')

process.exit(0)
