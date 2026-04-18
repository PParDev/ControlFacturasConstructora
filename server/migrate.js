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
    estado           TEXT             DEFAULT 'Activa',
    gasto_acumulado  REAL    NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- ───────────────────────────────────────────────────────────
  --  CATÁLOGO POR OBRA (Explosión de insumos)
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS catalogo_obras (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    obra_id          INTEGER NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    codigo           TEXT    NOT NULL,
    nombre           TEXT    NOT NULL,
    descripcion      TEXT             DEFAULT '',
    unidad           TEXT    NOT NULL DEFAULT 'pza',
    categoria        TEXT             DEFAULT '',
    cantidad_presupuestada REAL DEFAULT 0,
    precio_referencia REAL            DEFAULT 0,
    status           TEXT    NOT NULL DEFAULT 'Activo'
  );

  -- ───────────────────────────────────────────────────────────
  --  HISTORIAL DE PRECIOS
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS historial_precios (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    catalogo_obra_id INTEGER NOT NULL REFERENCES catalogo_obras(id) ON DELETE CASCADE,
    precio           REAL    NOT NULL,
    fecha            TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    factura_id       INTEGER REFERENCES facturas(id) ON DELETE SET NULL
  );

  -- ───────────────────────────────────────────────────────────
  --  PEDIDOS (Órdenes de Compra)
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS pedidos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    folio     TEXT    NOT NULL,
    obra_id   INTEGER NOT NULL REFERENCES obras(id),
    proveedor TEXT    NOT NULL DEFAULT '',
    producto  TEXT    NOT NULL DEFAULT '',
    cantidad  REAL    NOT NULL DEFAULT 0,
    unidad    TEXT             DEFAULT '',
    notas     TEXT             DEFAULT '',
    fecha     TEXT    NOT NULL DEFAULT (date('now','localtime')),
    catalogo_obra_id INTEGER          REFERENCES catalogo_obras(id),
    status    TEXT    NOT NULL DEFAULT 'Pendiente'
  );

  -- ───────────────────────────────────────────────────────────
  --  RECEPCIONES
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS recepciones (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    folio             TEXT    NOT NULL,
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
    fecha             TEXT    NOT NULL DEFAULT (date('now','localtime')),
    catalogo_obra_id  INTEGER          REFERENCES catalogo_obras(id)
  );

  -- ───────────────────────────────────────────────────────────
  --  FACTURAS
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS facturas (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    folio              TEXT    NOT NULL UNIQUE,  -- Folio interno del sistema (FAC-2026-0001)
    folio_interno      TEXT    GENERATED ALWAYS AS (folio) VIRTUAL, -- alias para compatibilidad
    folio_proveedor    TEXT             DEFAULT '', -- Folio/no. de la factura del proveedor
    obra_id            INTEGER NOT NULL REFERENCES obras(id),
    recepcion_id       INTEGER          REFERENCES recepciones(id),
    proveedor          TEXT             DEFAULT '',
    monto              REAL    NOT NULL DEFAULT 0,
    monto_max_facturable REAL           DEFAULT NULL,
    fecha              TEXT    NOT NULL DEFAULT (date('now','localtime')),
    status             TEXT    NOT NULL DEFAULT 'Pendiente'
  );

  -- ───────────────────────────────────────────────────────────
  --  DETALLES DE FACTURA
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS detalles_factura (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id       INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
    catalogo_obra_id INTEGER NOT NULL REFERENCES catalogo_obras(id),
    cantidad         REAL    NOT NULL DEFAULT 0,
    precio_unitario  REAL    NOT NULL DEFAULT 0,
    subtotal         REAL    NOT NULL DEFAULT 0
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
  --  CUENTAS BANCARIAS Y CAJA CHICA
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS cuentas_bancarias (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT    NOT NULL,
    tipo             TEXT    NOT NULL DEFAULT 'Fiscal', -- Fiscal, Crédito, Caja Chica
    saldo_inicial    REAL    NOT NULL DEFAULT 0,
    saldo_actual     REAL    NOT NULL DEFAULT 0,
    obra_id          INTEGER REFERENCES obras(id) ON DELETE SET NULL
  );

  -- ───────────────────────────────────────────────────────────
  --  TRANSACCIONES
  -- ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS transacciones (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    cuenta_id        INTEGER NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
    fecha            TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    tipo             TEXT    NOT NULL DEFAULT 'Cargo', -- Cargo, Abono
    monto            REAL    NOT NULL DEFAULT 0,
    concepto         TEXT    DEFAULT '',
    beneficiario     TEXT    DEFAULT '',
    obra_id          INTEGER REFERENCES obras(id) ON DELETE SET NULL,
    categoria        TEXT    DEFAULT 'General'
  );
`)

console.log('Tablas creadas / verificadas correctamente.')
process.exit(0)
