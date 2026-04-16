import { useState, useEffect } from 'react'
import { FlowIndicator } from '../components/FlowIndicator'
import { getPedidos, createPedidoBulk, getObras, getCatalogo } from '../lib/api'
import { Loader } from '../components/Loader'
import { today } from '../lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const FLOW = [
  { label: 'Pedido',    active: true, optional: true },
  { label: 'Recepción', optional: true },
  { label: 'Factura' },
  { label: 'Pago' },
]

export default function Pedidos() {
  const queryClient = useQueryClient()
  
  const { data: pedidos = [], isLoading: isLoadingPedidos } = useQuery({ queryKey: ['pedidos'], queryFn: getPedidos })
  const { data: obras = [], isLoading: isLoadingObras } = useQuery({ queryKey: ['obras'], queryFn: getObras })

  // Estado del documento principal (compartido por todos los items)
  const [doc, setDoc] = useState({ obra_id: '', proveedor: '', fecha: today(), notas: '' })

  const { data: catalogo = [], isLoading: isLoadingCat } = useQuery({ 
    queryKey: ['catalogo', doc.obra_id], 
    queryFn: () => getCatalogo(doc.obra_id),
    enabled: !!doc.obra_id
  })
  
  // Estado del item actual (para agregar a la lista)
  const [item, setItem] = useState({ producto: '', cantidad: '', unidad: '' })
  
  // Carrito de productos
  const [cart, setCart] = useState([])
  
  const [saved, setSaved] = useState(false)
  const [lastFolio, setLastFolio] = useState('')

  const isLoading = isLoadingPedidos || isLoadingObras || isLoadingCat

  useEffect(() => {
    if (obras.length > 0 && !doc.obra_id) {
      setDoc(d => ({ ...d, obra_id: obras[0].id }))
    }
  }, [obras, doc.obra_id])

  // Lógica para autocompletar unidad y proveedor al seleccionar un producto del catálogo
  useEffect(() => {
    if (item.producto) {
      const prodFind = catalogo.find(c => c.nombre.toLowerCase() === item.producto.toLowerCase())
      if (prodFind) {
        setItem(i => ({ ...i, unidad: prodFind.unidad }))
        if (prodFind.proveedor_habitual && !doc.proveedor) {
          setDoc(d => ({ ...d, proveedor: prodFind.proveedor_habitual }))
        }
      }
    }
  }, [item.producto, catalogo, doc.proveedor])

  const mutBulk = useMutation({
    mutationFn: createPedidoBulk,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      if (res.length > 0) setLastFolio(res[0].folio)
      setCart([])
      setItem({ producto: '', cantidad: '', unidad: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    },
    onError: (err) => {
      console.error(err)
      alert("Error al guardar pedido: " + err.message)
    }
  })

  const setD = k => e => setDoc(p => ({ ...p, [k]: e.target.value }))
  const setI = k => e => setItem(p => ({ ...p, [k]: e.target.value }))
  
  const addToCart = () => {
    if (!item.producto || !item.cantidad) return alert("Se requiere el producto y la cantidad")
    setCart(prev => [...prev, { ...item, cantidad: parseFloat(item.cantidad) }])
    setItem({ producto: '', cantidad: '', unidad: '' })
  }

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const save = () => {
    if (!doc.proveedor || !doc.obra_id) return alert("Proveedor y Obra son obligatorios")
    if (cart.length === 0) return alert("Debes agregar al menos un producto al pedido")
    
    // Armar el array de datos para el API bulk
    const payload = cart.map(c => ({
      obra_id: doc.obra_id,
      proveedor: doc.proveedor,
      fecha: doc.fecha,
      notas: doc.notas,
      producto: c.producto,
      cantidad: c.cantidad,
      unidad: c.unidad
    }))
    
    mutBulk.mutate(payload)
  }

  if (isLoading && pedidos.length === 0) {
    return (
      <div>
        <div className="page-title">Pedidos / Órdenes de Compra</div>
        <FlowIndicator steps={FLOW} />
        <Loader />
      </div>
    )
  }

  return (
    <div>
      <div className="page-title">Pedidos / Órdenes de Compra</div>
      <div className="page-sub pb-2">Registra un pedido formal a un proveedor — <span className="text-blue-600 font-semibold">(Paso Opcional)</span></div>

      <FlowIndicator steps={FLOW} />

      <div className="alert alert-info mt-4 mb-4">
        ℹ️ Este paso es <strong>opcional</strong>. Si no haces pedidos formales, puedes pasar directamente a registrar la <strong>Recepción</strong> del material o la <strong>Factura</strong>.
      </div>

      <div className="card">
        <div className="card-title">Crear Nuevo Pedido</div>
        
        {obras.length === 0 && !isLoadingObras && (
          <div className="alert alert-info mb-3">Primero debe registrar una Obra para asignarle el pedido.</div>
        )}

        {/* DATOS DEL DOCUMENTO */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5 pb-5 border-b border-gray-100">
          <div className="field">
            <label>Obra</label>
            <select value={doc.obra_id} onChange={(e) => {
               setDoc(p => ({ ...p, obra_id: e.target.value }))
               setItem({ producto: '', cantidad: '', unidad: '' }) // Reset item as catalog changed
               setCart([]) // Optional: reset cart on obra change to avoid cross-project errors
            }} disabled={obras.length === 0}>
              <option value="" disabled>Selecciona una obra...</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Proveedor</label>
            <input value={doc.proveedor} onChange={setD('proveedor')} placeholder="Ej. El Toro, Cementos Nayar" />
          </div>
          <div className="field">
            <label>Fecha de solicitud</label>
            <input type="date" value={doc.fecha} onChange={setD('fecha')} />
          </div>
          <div className="field">
            <label>Notas adicionales</label>
            <input value={doc.notas} onChange={setD('notas')} placeholder="Ej. Entregar antes de mediodía" />
          </div>
        </div>

        {/* DATALIST para el Autocomplete NATIVO */}
        <datalist id="lista-catalogo">
          {catalogo.map(c => (
            <option key={c.id} value={c.nombre} />
          ))}
        </datalist>

        {/* AGREGAR PRODUCTOS */}
        <div className="bg-blue-50/50 p-4 rounded-lg mb-4 border border-blue-100">
          <div className="text-sm font-semibold text-blue-900 mb-3">Agregar Insumos al Pedido</div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="field flex-1 min-w-[200px]">
              <label>Producto a pedir (Busca en el catálogo)</label>
              <input 
                value={item.producto} 
                onChange={setI('producto')} 
                list="lista-catalogo" 
                placeholder="Escribe para autocompletar..." 
              />
            </div>
            <div className="field w-24">
              <label>Cantidad</label>
              <input type="number" min="0" step="any" value={item.cantidad} onChange={setI('cantidad')} placeholder="0" />
            </div>
            <div className="field w-32">
              <label>Unidad</label>
              <input value={item.unidad} onChange={setI('unidad')} placeholder="Pza, m3..." />
            </div>
            <div className="pb-[1px]">
              <button className="btn bg-blue-600 border border-blue-700 hover:bg-blue-700 text-white shadow-sm" onClick={addToCart}>
                + Añadir a lista
              </button>
            </div>
          </div>
        </div>

        {/* CARRITO DE PRODUCTOS */}
        {cart.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Insumos listos para pedir:</div>
            <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
              <table className="m-0 border-0">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-2">Producto</th>
                    <th className="py-2 w-24 text-center">Cantidad</th>
                    <th className="py-2 w-24">Unidad</th>
                    <th className="py-2 w-16 text-center">X</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((c, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2 px-3">{c.producto}</td>
                      <td className="py-2 px-3 text-center font-medium bg-gray-50">{c.cantidad}</td>
                      <td className="py-2 px-3 text-gray-500 text-sm">{c.unidad}</td>
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => removeFromCart(i)} className="text-red-500 hover:text-red-700 font-bold" title="Quitar">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {saved && (
          <div className="alert alert-success mt-4">
            ✓ Pedido registrado correctamente. Folio: {lastFolio}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <button className="btn btn-primary w-full sm:w-auto text-center justify-center flex" onClick={save} disabled={mutBulk.isPending || obras.length === 0 || cart.length === 0}>
            {mutBulk.isPending ? 'Procesando...' : `Generar Orden de Compra formal (${cart.length} productos)`}
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="card mt-4">
        <div className="card-title">Historial de Pedidos / Órdenes</div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Folio</th><th>Fecha</th><th>Proveedor</th>
                <th>Obra</th><th>Producto</th><th>Cantidad</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map(p => (
                <tr key={p.id}>
                  <td className="font-medium text-gray-700">{p.folio}</td>
                  <td>{p.fecha}</td>
                  <td>{p.proveedor}</td>
                  <td>{obras.find(o => o.id === p.obra_id)?.nombre || `Obra #${p.obra_id}`}</td>
                  <td>{p.producto}</td>
                  <td>{p.cantidad} <span className="text-xs text-gray-500">{p.unidad}</span></td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium 
                      ${p.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.status || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
              {pedidos.length === 0 && !isLoadingPedidos && (
                <tr><td colSpan="7" className="text-center text-gray-400">No hay pedidos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
