import db from './db.js';
console.log(db.prepare("SELECT * FROM recepciones WHERE folio = 'REC-001'").all());
