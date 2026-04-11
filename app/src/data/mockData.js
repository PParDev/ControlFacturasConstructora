export const OBRAS_INIT = [
  { id: 1, nombre: 'Residencial Houston', cliente: 'Familia Martínez', ubicacion: 'Col. Las Quintas, Tepic', inicio: '10/01/2026', cierre: '30/06/2026', status: 'Activa',    gasto: 54200 },
  { id: 2, nombre: 'Tulipán 234',         cliente: 'Inmobiliaria Nayar',    ubicacion: 'Col. Las Flores, Tepic',  inicio: '15/02/2026', cierre: '15/08/2026', status: 'Activa',    gasto: 38000 },
  { id: 3, nombre: 'Pedregal Norte',      cliente: 'Constructora Pacífico', ubicacion: 'Fracc. Pedregal, Tepic',  inicio: '05/01/2026', cierre: '01/07/2026', status: 'En pausa', gasto: 22000 },
  { id: 4, nombre: 'Vista Hermosa',       cliente: 'Familia Ruiz',          ubicacion: 'Col. Vista Hermosa, Tepic', inicio: '01/10/2025', cierre: '20/01/2026', status: 'Terminada', gasto: 10000 },
]

export const FACTURAS_INIT = [
  { id: 1, folio: 'FAC-0889', proveedor: 'El Toro',       obra: 'Residencial Houston', monto: 12000, fecha: '15/03/2026', status: 'Pagada'   },
  { id: 2, folio: 'FAC-0890', proveedor: 'Cementos Nayar', obra: 'Tulipán 234',        monto: 22400, fecha: '—',          status: 'Pendiente' },
  { id: 3, folio: 'FAC-0891', proveedor: 'El Toro',       obra: 'Pedregal Norte',      monto: 14100, fecha: '—',          status: 'Pendiente' },
]

export const PAGOS_INIT = [
  { id: 1, fecha: '15/03', factura: 'FAC-0889', proveedor: 'El Toro',        obra: 'Houston',  monto: 12000, forma: 'Transferencia', status: 'Pagado'   },
  { id: 2, fecha: '—',     factura: 'FAC-0890', proveedor: 'Cementos Nayar', obra: 'Tulipán',  monto: 22400, forma: '—',             status: 'Pendiente' },
  { id: 3, fecha: '—',     factura: 'FAC-0891', proveedor: 'El Toro',        obra: 'Pedregal', monto: 14100, forma: '—',             status: 'Pendiente' },
]

export const GASTOS_INIT = [
  { id: 1, fecha: '19/03', obra: 'Houston',  cat: 'Material',      concepto: 'Varilla corrugada', monto: 12000 },
  { id: 2, fecha: '18/03', obra: 'Tulipán',  cat: 'Mano de obra',  concepto: 'Cuadrilla semana',  monto: 8000  },
  { id: 3, fecha: '17/03', obra: 'Houston',  cat: 'Caja chica',    concepto: 'Transporte',        monto: 1200  },
  { id: 4, fecha: '16/03', obra: 'Pedregal', cat: 'Material',      concepto: 'Blocks y arena',    monto: 22000 },
]

export const CHEQUES_INIT = [
  { id: 1, fecha: '01/04', bene: '—',                cargo: 0,     abono: 100000, saldo: 100000, obra: '—'      },
  { id: 2, fecha: '05/04', bene: 'El Toro',          cargo: 5000,  abono: 0,      saldo: 95000,  obra: 'Houston' },
]

export const CREDITO_INIT = [
  { id: 1, fecha: '10/03', bene: 'Ferretería Central', cargo: 8400,  abono: 0, saldo: 8400,  obra: 'Houston' },
  { id: 2, fecha: '14/03', bene: 'Materiales Nayar',   cargo: 10000, abono: 0, saldo: 18400, obra: 'Tulipán'  },
]

export const CATALOGO_INIT = [
  { id: 1, codigo: 'P-001', nombre: 'Varilla 3/8',   desc: 'Varilla corrugada de 3/8"',    unidad: 'pieza',  cat: 'acero',     precio: 45,  prov: 'El Toro',        status: 'Activo'   },
  { id: 2, codigo: 'P-002', nombre: 'Block 15×20',   desc: 'Block de concreto 15×20×40',   unidad: 'pieza',  cat: 'block',     precio: 8.5, prov: 'Cementos Nayar', status: 'Activo'   },
  { id: 3, codigo: 'P-003', nombre: 'Arena m³',      desc: 'Arena gruesa para construcción', unidad: 'm³',   cat: 'agregados', precio: 280, prov: 'Materiales Nayar', status: 'Activo' },
  { id: 4, codigo: 'P-004', nombre: 'Alambrón',      desc: 'Alambrón recocido',             unidad: 'kg',    cat: 'acero',     precio: 32,  prov: 'El Toro',        status: 'Activo'   },
  { id: 5, codigo: 'P-005', nombre: 'Cemento 50kg',  desc: 'Cemento Portland bolsa 50 kg', unidad: 'costal', cat: 'concreto',  precio: 185, prov: 'Cementos Nayar', status: 'Activo'   },
  { id: 6, codigo: 'P-006', nombre: 'Grava m³',      desc: 'Grava triturada para mezcla',  unidad: 'm³',    cat: 'agregados', precio: 320, prov: 'Materiales Nayar', status: 'Inactivo' },
]
