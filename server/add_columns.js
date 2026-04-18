import Database from 'better-sqlite3'
const db = new Database('data/constructora.db')

try { db.prepare('ALTER TABLE recepciones ADD COLUMN catalogo_obra_id INTEGER').run(); } catch(e) { console.log(e.message) }
try { db.prepare('ALTER TABLE pedidos ADD COLUMN catalogo_obra_id INTEGER').run(); } catch(e) { console.log(e.message) }
try { db.prepare('ALTER TABLE obras ADD COLUMN estado TEXT DEFAULT "Activa"').run(); } catch(e) { console.log(e.message) }
console.log('Done')
