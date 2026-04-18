import db from './db.js';
console.log(db.prepare("SELECT * FROM pedidos WHERE id IN (6, 7)").all());
