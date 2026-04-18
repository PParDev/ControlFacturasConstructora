import db from './db.js';

try {
  db.exec(`
    PRAGMA foreign_keys=off;
    
    CREATE TABLE IF NOT EXISTS recepciones_new (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      folio             TEXT    NOT NULL,
      obra_id           INTEGER NOT NULL REFERENCES obras(id),
      pedido_id         INTEGER          REFERENCES pedidos(id),
      catalogo_obra_id  INTEGER          REFERENCES catalogo_obras(id),
      tipo_flujo        TEXT    NOT NULL DEFAULT 'sin_pedido',
      proveedor         TEXT             DEFAULT '',
      producto          TEXT             DEFAULT '',
      cantidad_pedida   REAL             DEFAULT 0,
      cantidad_recibida REAL    NOT NULL DEFAULT 0,
      faltante          REAL             DEFAULT 0,
      entrego           TEXT             DEFAULT '',
      recibio           TEXT             DEFAULT '',
      fecha             TEXT    NOT NULL DEFAULT (date('now','localtime'))
    );
    
    INSERT INTO recepciones_new 
    SELECT id, folio, obra_id, pedido_id, catalogo_obra_id, tipo_flujo, proveedor, producto, cantidad_pedida, cantidad_recibida, faltante, entrego, recibio, fecha 
    FROM recepciones;
    
    DROP TABLE recepciones;
    ALTER TABLE recepciones_new RENAME TO recepciones;
    
    PRAGMA foreign_keys=on;
  `);
  console.log("Schema fix applied successfully.");
} catch(e) {
  console.error("Error applying schema fix:", e.message);
}
