import db from './db.js';

console.log('--- Iniciando migración v5: Estructura de Recepciones (Cabecera/Detalle) ---');

try {
  db.transaction(() => {
    // 1. Crear nuevas tablas
    db.exec(`
      CREATE TABLE IF NOT EXISTS recepciones_header (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        folio             TEXT    NOT NULL UNIQUE,
        obra_id           INTEGER NOT NULL REFERENCES obras(id),
        tipo_flujo        TEXT    NOT NULL DEFAULT 'sin_pedido',
        proveedor         TEXT             DEFAULT '',
        entrego           TEXT             DEFAULT '',
        recibio           TEXT             DEFAULT '',
        fecha             TEXT    NOT NULL DEFAULT (date('now','localtime'))
      );

      CREATE TABLE IF NOT EXISTS recepcion_detalles (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        recepcion_id      INTEGER NOT NULL REFERENCES recepciones_header(id) ON DELETE CASCADE,
        pedido_id         INTEGER          REFERENCES pedidos(id),
        producto          TEXT             DEFAULT '',
        cantidad_pedida   REAL             DEFAULT 0,
        cantidad_recibida REAL    NOT NULL DEFAULT 0,
        faltante          REAL             DEFAULT 0,
        catalogo_obra_id  INTEGER          REFERENCES catalogo_obras(id)
      );
    `);

    // 2. Migrar datos existentes
    const oldRecs = db.prepare('SELECT * FROM recepciones').all();
    const folioToHeaderId = {};

    for (const r of oldRecs) {
      if (!folioToHeaderId[r.folio]) {
        // Insertar cabecera si es folio nuevo
        const info = db.prepare(`
          INSERT INTO recepciones_header (folio, obra_id, tipo_flujo, proveedor, entrego, recibio, fecha)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(r.folio, r.obra_id, r.tipo_flujo, r.proveedor, r.entrego, r.recibio, r.fecha);
        folioToHeaderId[r.folio] = info.lastInsertRowid;
      }

      // Insertar detalle
      db.prepare(`
        INSERT INTO recepcion_detalles (recepcion_id, pedido_id, producto, cantidad_pedida, cantidad_recibida, faltante, catalogo_obra_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(folioToHeaderId[r.folio], r.pedido_id, r.producto, r.cantidad_pedida, r.cantidad_recibida, r.faltante, r.catalogo_obra_id);
    }

    // 3. Actualizar tabla de Facturas para que apunte al Header ID
    // Buscamos todas las facturas que tengan recepcion_id (que actualmente apunta a la fila de item)
    const facts = db.prepare('SELECT id, recepcion_id FROM facturas WHERE recepcion_id IS NOT NULL').all();
    for (const f of facts) {
      const oldRec = oldRecs.find(r => r.id === f.recepcion_id);
      if (oldRec) {
        const newHeaderId = folioToHeaderId[oldRec.folio];
        if (newHeaderId) {
          db.prepare('UPDATE facturas SET recepcion_id = ? WHERE id = ?').run(newHeaderId, f.id);
        }
      }
    }

    // 4. Renombrar tablas
    db.exec(`
      ALTER TABLE recepciones RENAME TO recepciones_old;
      ALTER TABLE recepciones_header RENAME TO recepciones;
    `);

    console.log('Migración completada con éxito.');
  })();
} catch (err) {
  console.error('Error en migración v5:', err.message);
  process.exit(1);
}

process.exit(0);
