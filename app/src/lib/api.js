export async function getAPI(endpoint) {
  const res = await fetch(endpoint)
  if (!res.ok) throw new Error('Error al obtener datos: ' + res.statusText)
  return res.json()
}

export async function postAPI(endpoint, data) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Error al guardar datos: ' + res.statusText)
  return res.json()
}

export async function putAPI(endpoint, data) {
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Error al actualizar datos: ' + res.statusText)
  return res.json()
}

export async function patchAPI(endpoint, data) {
  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  })
  if (!res.ok) throw new Error('Error al actualizar: ' + res.statusText)
  return res.json()
}

export async function deleteAPI(endpoint) {
  const res = await fetch(endpoint, { method: 'DELETE' })
  if (!res.ok) throw new Error('Error al eliminar datos: ' + res.statusText)
  return res.json()
}

export async function uploadAPI(endpoint, formData) {
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData
  })
  if (!res.ok) throw new Error('Error al importar archivo: ' + res.statusText)
  return res.json()
}

// Obras
export const getObras = () => getAPI('/api/obras')
export const getObra = (id) => getAPI(`/api/obras/${id}`)
export const createObra = (data) => postAPI('/api/obras', data)
export const updateObra = (id, data) => putAPI(`/api/obras/${id}`, data)
export const deleteObra = (id) => deleteAPI(`/api/obras/${id}`)

// Gastos
export const getGastos = () => getAPI('/api/gastos')
export const createGasto = (data) => postAPI('/api/gastos', data)

// Facturas
export const getFacturas = () => getAPI('/api/facturas')
export const createFactura = (data) => postAPI('/api/facturas', data)

// Pedidos
export const getPedidos = () => getAPI('/api/pedidos')
export const createPedido = (data) => postAPI('/api/pedidos', data)
export const createPedidoBulk = (data) => postAPI('/api/pedidos/bulk', data)

// Recepciones
export const getRecepciones = () => getAPI('/api/recepciones')
export const createRecepcion = (data) => postAPI('/api/recepciones', data)

// Pagos
export const getPagos = () => getAPI('/api/pagos')
export const createPago = (data) => postAPI('/api/pagos', data)

// Cuentas / Movimientos
export const getCuentas = () => getAPI('/api/cuentas')
export const createCuenta = (data) => postAPI('/api/cuentas', data)
export const getTransacciones = (id) => getAPI(`/api/cuentas/${id}/transacciones`)
export const createTransaccion = (id, data) => postAPI(`/api/cuentas/${id}/transacciones`, data)

// Catalogo
export const getCatalogo = (obra_id) => {
  let url = '/api/catalogo'
  if (obra_id) url += `?obra_id=${obra_id}`
  return getAPI(url)
}
export const createCatalogo = (data) => postAPI('/api/catalogo', data)
export const updateCatalogo = (id, data) => putAPI(`/api/catalogo/${id}`, data)
export const toggleCatalogo = (id) => patchAPI(`/api/catalogo/${id}/toggle`)

// Dashboard
export const getDashboard = () => getAPI('/api/dashboard')

// Reportes
export const getExplosionInsumos = (obra_id) => getAPI(`/api/reportes/explosion-insumos/${obra_id}`)
export const getHistorialVariaciones = (obra_id) => getAPI(`/api/reportes/historial-variaciones/${obra_id}`)
export const getEstadoCuenta = (cuenta_id, desde, hasta) => {
  let url = `/api/reportes/estado-cuenta?cuenta_id=${cuenta_id}`
  if (desde) url += `&desde=${desde}`
  if (hasta) url += `&hasta=${hasta}`
  return getAPI(url)
}

// Importador
export const importarCatalogo = (formData) => uploadAPI('/api/importador', formData)
