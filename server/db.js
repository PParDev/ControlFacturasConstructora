import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'data', 'constructora.db')

const db = new Database(DB_PATH)

// Mejora de rendimiento: WAL mode para escrituras concurrentes
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export default db
