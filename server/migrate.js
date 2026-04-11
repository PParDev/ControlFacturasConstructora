import db from './db.js'

/**
 * Crea todas las tablas si no existen aún.
 * Es seguro correrlo más de una vez (usa IF NOT EXISTS).
 */
db.exec(`
  -- ───────────────────────────────────────────────────────────
  --  OBRAS
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS obras (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT    NOT NULL,
    cliente          TEXT    NOT NULL DEFAULT '',
    ubicacion        TEXT             DEFAULT '',
    fecha_inicio     TEXT             DEFAULT '',
    fecha_cierre     TEXT             DEFAULT '',
    status           TEXT    NOT NULL DEFAULT 'Activa',
    gasto_acumulado  REAL    NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- ───────────────────────────────────────────────────────────
  --  CATÁLOGO DE PRODUCTOS
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS catalogo_productos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo           TEXT    NOT NULL UNIQUE,
    nombre           TEXT    NOT NULL,
    descripcion      TEXT             DEFAULT '',
    unidad           TEXT    NOT NULL DEFAULT 'pza',
    categoria        TEXT             DEFAULT '',
    precio_referencia REAL            DEFAULT 0,
    proveedor_habitual TEXT           DEFAULT '',
    status           TEXT    NOT NULL DEFAULT 'Activo'
  );

  -- ───────────────────────────────────────────────────────────
  --  PEDIDOS (Órdenes de Compra)
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS pedidos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    folio     TEXT    NOT NULL UNIQUE,
    obra_id   INTEGER NOT NULL REFERENCES obras(id),
    proveedor TEXT    NOT NULL DEFAULT '',
    producto  TEXT    NOT NULL DEFAULT '',
    cantidad  REAL    NOT NULL DEFAULT 0,
    unidad    TEXT             DEFAULT '',
    notas     TEXT             DEFAULT '',
    fecha     TEXT    NOT NULL DEFAULT (date('now','localtime')),
    status    TEXT    NOT NULL DEFAULT 'Pendiente'
  );

  -- ───────────────────────────────────────────────────────────
  --  RECEPCIONES
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS recepciones (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    folio             TEXT    NOT NULL UNIQUE,
    obra_id           INTEGER NOT NULL REFERENCES obras(id),
    pedido_id         INTEGER          REFERENCES pedidos(id),
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

  -- ───────────────────────────────────────────────────────────
  --  FACTURAS
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS facturas (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    folio              TEXT    NOT NULL UNIQUE,
    obra_id            INTEGER NOT NULL REFERENCES obras(id),
    recepcion_id       INTEGER          REFERENCES recepciones(id),
    proveedor          TEXT             DEFAULT '',
    monto              REAL    NOT NULL DEFAULT 0,
    monto_max_facturable REAL           DEFAULT NULL,
    fecha              TEXT    NOT NULL DEFAULT (date('now','localtime')),
    status             TEXT    NOT NULL DEFAULT 'Pendiente'
  );

  -- ───────────────────────────────────────────────────────────
  --  PAGOS
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS pagos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id  INTEGER NOT NULL REFERENCES facturas(id),
    monto       REAL    NOT NULL DEFAULT 0,
    forma_pago  TEXT             DEFAULT 'Transferencia',
    referencia  TEXT             DEFAULT '',
    fecha       TEXT    NOT NULL DEFAULT (date('now','localtime')),
    status      TEXT    NOT NULL DEFAULT 'Pagado'
  );

  -- ───────────────────────────────────────────────────────────
  --  GASTOS (Caja Chica, Material manual, Mano de Obra)
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS gastos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    obra_id   INTEGER NOT NULL REFERENCES obras(id),
    categoria TEXT    NOT NULL DEFAULT 'Caja chica',
    concepto  TEXT    NOT NULL DEFAULT '',
    monto     REAL    NOT NULL DEFAULT 0,
    fecha     TEXT    NOT NULL DEFAULT (date('now','localtime'))
  );

  -- ───────────────────────────────────────────────────────────
  --  MOVIMIENTOS CUENTA CHEQUES
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS mov_cheques (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    obra_id      INTEGER REFERENCES obras(id),
    fecha        TEXT    NOT NULL DEFAULT (date('now','localtime')),
    beneficiario TEXT             DEFAULT '',
    cargo        REAL    NOT NULL DEFAULT 0,
    abono        REAL    NOT NULL DEFAULT 0,
    saldo        REAL    NOT NULL DEFAULT 0
  );

  -- ───────────────────────────────────────────────────────────
  --  MOVIMIENTOS TARJETA CRÉDITO
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS mov_credito (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    obra_id      INTEGER REFERENCES obras(id),
    fecha        TEXT    NOT NULL DEFAULT (date('now','localtime')),
    beneficiario TEXT             DEFAULT '',
    cargo        REAL    NOT NULL DEFAULT 0,
    abono        REAL    NOT NULL DEFAULT 0,
    saldo        REAL    NOT NULL DEFAULT 0
  );
`)

console.log('✅ Tablas creadas / verificadas correctamente.')
process.exit(0)
