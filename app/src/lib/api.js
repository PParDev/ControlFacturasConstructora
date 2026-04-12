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

// Obras
export const getObras = () => getAPI('/api/obras')
export const getObra = (id) => getAPI(`/api/obras/${id}`)
export const createObra = (data) => postAPI('/api/obras', data)

// Gastos
export const getGastos = () => getAPI('/api/gastos')
export const createGasto = (data) => postAPI('/api/gastos', data)

// Facturas
export const getFacturas = () => getAPI('/api/facturas')
export const createFactura = (data) => postAPI('/api/facturas', data)

// Pedidos
export const getPedidos = () => getAPI('/api/pedidos')
export const createPedido = (data) => postAPI('/api/pedidos', data)

// Recepciones
export const getRecepciones = () => getAPI('/api/recepciones')
export const createRecepcion = (data) => postAPI('/api/recepciones', data)

// Pagos
export const getPagos = () => getAPI('/api/pagos')
export const createPago = (data) => postAPI('/api/pagos', data)

// Cuentas / Movimientos
export const getCheques = () => getAPI('/api/cuentas/cheques')
export const createCheque = (data) => postAPI('/api/cuentas/cheques', data)

export const getCredito = () => getAPI('/api/cuentas/credito')
export const createCredito = (data) => postAPI('/api/cuentas/credito', data)

// Catalogo
export const getCatalogo = () => getAPI('/api/catalogo')
export const createCatalogo = (data) => postAPI('/api/catalogo', data)
export const updateCatalogo = (id, data) => putAPI(`/api/catalogo/${id}`, data)
export const toggleCatalogo = (id) => patchAPI(`/api/catalogo/${id}/toggle`)

// Dashboard
export const getDashboard = () => getAPI('/api/dashboard')
