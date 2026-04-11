const STATUS_CLS = {
  Activa:      'badge badge-green',
  Activo:      'badge badge-green',
  Pagada:      'badge badge-green',
  Pagado:      'badge badge-green',
  Surtida:     'badge badge-green',
  Correcto:    'badge badge-green',
  Ajustado:    'badge badge-green',
  'En pausa':  'badge badge-yellow',
  Pendiente:   'badge badge-yellow',
  Parcial:     'badge badge-blue',
  Facturada:   'badge badge-blue',
  Terminada:   'badge badge-gray',
  Inactivo:    'badge badge-gray',
  Cancelada:   'badge badge-red',
}

export function Badge({ s }) {
  return <span className={STATUS_CLS[s] ?? 'badge badge-gray'}>{s}</span>
}

const CAT_CLS = {
  'Material':     'badge badge-blue',
  'Mano de obra': 'badge badge-green',
  'Caja chica':   'badge badge-yellow',
}

export function CatBadge({ s }) {
  return <span className={CAT_CLS[s] ?? 'badge badge-gray'}>{s}</span>
}
