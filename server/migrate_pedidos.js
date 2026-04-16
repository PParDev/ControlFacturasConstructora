import db from './db.js'

console.log('Iniciando migración de Pedidos (Remover UNIQUE constraint)...')

// Desactivar temporalmente las llaves foráneas para poder hacer DROP
db.pragma('foreign_keys = OFF')

db.transaction(() => {
  // 1. Crear tabla temporal sin UNIQUE
  db.prepare(`
    CREATE TABLE IF NOT EXISTS pedidos_new (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      folio     TEXT    NOT NULL,
      obra_id   INTEGER NOT NULL REFERENCES obras(id),
      proveedor TEXT    NOT NULL DEFAULT '',
      producto  TEXT    NOT NULL DEFAULT '',
      cantidad  REAL    NOT NULL DEFAULT 0,
      unidad    TEXT             DEFAULT '',
      notas     TEXT             DEFAULT '',
      fecha     TEXT    NOT NULL DEFAULT (date('now','localtime')),
      status    TEXT    NOT NULL DEFAULT 'Pendiente'
    );
  `).run()

  // 2. Copiar datos
  db.prepare(`INSERT INTO pedidos_new SELECT * FROM pedidos;`).run()

  // 3. Eliminar tabla original
  db.prepare(`DROP TABLE pedidos;`).run()

  // 4. Renombrar tabla nueva
  db.prepare(`ALTER TABLE pedidos_new RENAME TO pedidos;`).run()
})()

// Reactivar llaves foráneas
db.pragma('foreign_keys = ON')

console.log('Migración completada exitosamente.')
process.exit(0)
