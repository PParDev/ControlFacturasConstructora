import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FlowIndicator } from '../components/FlowIndicator'
import { getPedidos, createPedidoBulk, getObras, getCatalogo } from '../lib/api'
import { toast } from '../lib/toast'
import { Loader } from '../components/Loader'
import { fmt, today } from '../lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const FLOW = [
  { label: 'Pedido',    active: true, optional: true },
  { label: 'Recepción', optional: true },
  { label: 'Factura' },
  { label: 'Pago' },
]

const ITEM_EMPTY = { catalogo_obra_id: '', cantidad: '', busqueda: '' }

export default function Pedidos() {
  const queryClient = useQueryClient()

  const { data: pedidos = [], isLoading: isLoadingPedidos } = useQuery({ queryKey: ['pedidos'], queryFn: getPedidos })
  const { data: obras   = [], isLoading: isLoadingObras   } = useQuery({ queryKey: ['obras'],   queryFn: getObras   })

  // Datos generales de la OC (compartidos por todos los items)
  const [doc,  setDoc]  = useState({ obra_id: '', proveedor: '', fecha: today(), notas: '' })
  const [item, setItem] = useState(ITEM_EMPTY)
  const [cart, setCart] = useState([])
  const [saved, setSaved]         = useState(false)
  const [lastFolio, setLastFolio] = useState('')
  const [expandedOC, setExpandedOC] = useState({})

  const { data: catalogo = [], isLoading: isLoadingCat } = useQuery({
    queryKey: ['catalogo', doc.obra_id],
    queryFn:  () => getCatalogo(doc.obra_id),
    enabled:  !!doc.obra_id
  })

  useEffect(() => {
    if (obras.length > 0 && !doc.obra_id) setDoc(d => ({ ...d, obra_id: obras[0].id }))
  }, [obras, doc.obra_id])

  // Al cambiar de obra, limpiar carrito e item
  const handleObraChange = (e) => {
    setDoc(p => ({ ...p, obra_id: e.target.value }))
    setCart([])
    setItem(ITEM_EMPTY)
  }

  // Catálogo filtrado por búsqueda
  const catFiltrado = item.busqueda
    ? catalogo.filter(c =>
        c.nombre.toLowerCase().includes(item.busqueda.toLowerCase()) ||
        (c.codigo || '').toLowerCase().includes(item.busqueda.toLowerCase())
      )
    : catalogo

  const insumoSeleccionado = catalogo.find(c => c.id == item.catalogo_obra_id)

  const mutBulk = useMutation({
    mutationFn: createPedidoBulk,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      if (res.length > 0) setLastFolio(res[0].folio)
      setCart([])
      setItem(ITEM_EMPTY)
      setSaved(true)
      setTimeout(() => setSaved(false), 5000)
    },
    onError: (err) => toast.error('Error al guardar pedido: ' + err.message)
  })

  const setD = k => e => setDoc(p => ({ ...p, [k]: e.target.value }))

  const addToCart = () => {
    if (!item.catalogo_obra_id) { toast.error('Selecciona un insumo del catálogo'); return }
    if (!item.cantidad || parseFloat(item.cantidad) <= 0) { toast.error('Ingresa una cantidad válida'); return }
    const ins = catalogo.find(c => c.id == item.catalogo_obra_id)
    setCart(prev => [...prev, {
      catalogo_obra_id: parseInt(item.catalogo_obra_id),
      producto:  ins?.nombre || '',
      unidad:    ins?.unidad || '',
      cantidad:  parseFloat(item.cantidad),
      precio_ref: ins?.precio_referencia || 0
    }])
    setItem(ITEM_EMPTY)
  }

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index))

  const save = () => {
    if (!doc.proveedor || !doc.obra_id) { toast.error('Proveedor y Obra son obligatorios'); return }
    if (cart.length === 0) { toast.error('Agrega al menos un insumo al pedido'); return }

    const payload = cart.map(c => ({
      obra_id:         parseInt(doc.obra_id),
      proveedor:       doc.proveedor,
      fecha:           doc.fecha,
      notas:           doc.notas,
      catalogo_obra_id: c.catalogo_obra_id,
      producto:        c.producto,
      cantidad:        c.cantidad,
      unidad:          c.unidad
    }))

    mutBulk.mutate(payload)
  }

  const isLoading = isLoadingPedidos || isLoadingObras

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
      <div className="page-sub pb-2">
        Registra un pedido formal a un proveedor — <span className="text-blue-600 font-semibold">(Paso Opcional)</span>
      </div>

      <FlowIndicator steps={FLOW} />

      <div className="alert alert-info mt-4 mb-4">
        Este paso es <strong>opcional</strong>. Si no haces pedidos formales, puedes pasar directamente a <strong>Recepción</strong> o a <strong>Facturas</strong>.
      </div>

      <div className="card">
        <div className="card-title">Crear Nuevo Pedido</div>

        {obras.length === 0 && !isLoadingObras && (
          <div className="alert alert-info mb-3">Primero registra una Obra.</div>
        )}

        {/* Datos del documento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5 pb-5 border-b border-gray-100">
          <div className="field">
            <label>Obra</label>
            <select value={doc.obra_id} onChange={handleObraChange} disabled={obras.length === 0}>
              <option value="" disabled>Selecciona una obra...</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
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

        {/* Agregar insumos */}
        <div className="bg-blue-50/50 p-4 rounded-lg mb-4 border border-blue-100">
          <div className="text-sm font-semibold text-blue-900 mb-3">Agregar insumos al pedido</div>

          {!doc.obra_id ? (
            <p className="text-sm text-gray-400">Selecciona una obra para ver su catálogo.</p>
          ) : isLoadingCat ? (
            <p className="text-sm text-gray-400">Cargando catálogo...</p>
          ) : catalogo.length === 0 ? (
            <p className="text-sm text-orange-600">⚠ Esta obra no tiene catálogo. Importa uno en la sección <strong>Catálogo</strong>.</p>
          ) : (
            <div className="space-y-2">
              {/* Buscador */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Buscar insumo del catálogo
                  </label>
                  <input
                    className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-[7px] outline-none focus:border-blue-400"
                    placeholder="Código o nombre..."
                    value={item.busqueda}
                    onChange={e => setItem(i => ({ ...i, busqueda: e.target.value, catalogo_obra_id: '' }))}
                  />
                </div>
                <div className="flex-1 min-w-[120px] max-w-[160px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Cantidad {insumoSeleccionado ? `(${insumoSeleccionado.unidad})` : ''}
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="0" step="any"
                      className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-[7px] outline-none focus:border-blue-400"
                      placeholder="0"
                      value={item.cantidad}
                      onChange={e => setItem(i => ({ ...i, cantidad: e.target.value }))}
                    />
                    {insumoSeleccionado && (
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                         {insumoSeleccionado.unidad}
                       </span>
                    )}
                  </div>
                </div>
                <div className="pb-[1px]">
                  <button
                    className="btn bg-blue-600 border border-blue-700 hover:bg-blue-700 text-white shadow-sm"
                    onClick={addToCart}
                    disabled={!item.catalogo_obra_id || !item.cantidad}
                  >
                    + Añadir a lista
                  </button>
                </div>
              </div>

              {/* Lista del catálogo filtrada */}
              {(item.busqueda || catFiltrado.length <= 8) && (
                <div className="border border-gray-200 rounded-md overflow-hidden max-h-48 overflow-y-auto">
                  {catFiltrado.length === 0 ? (
                    <p className="text-xs text-gray-400 px-3 py-2">Sin resultados para "{item.busqueda}"</p>
                  ) : (
                    catFiltrado.map(c => (
                      <div
                        key={c.id}
                        onClick={() => setItem(i => ({ ...i, catalogo_obra_id: c.id, busqueda: '' }))}
                        className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors border-b border-gray-100 last:border-0
                          ${item.catalogo_obra_id == c.id ? 'bg-blue-50 text-blue-800 font-medium' : 'hover:bg-gray-50'}`}
                      >
                        <div>
                          {c.codigo && <span className="font-mono text-[10px] text-gray-400 mr-2">[{c.codigo}]</span>}
                          <span className="text-gray-800">{c.nombre}</span>
                          <span className="ml-1.5 text-xs text-gray-400">{c.unidad}</span>
                        </div>
                        <span className="text-xs text-gray-500 ml-3">{fmt(c.precio_referencia)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Insumo seleccionado */}
              {insumoSeleccionado && (
                <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  <span className="font-semibold">Seleccionado:</span>
                  {insumoSeleccionado.codigo && <span className="font-mono text-xs">[{insumoSeleccionado.codigo}]</span>}
                  {insumoSeleccionado.nombre}
                  <span className="text-xs text-blue-500">· ref. {fmt(insumoSeleccionado.precio_referencia)} / {insumoSeleccionado.unidad}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Carrito */}
        {cart.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Insumos del pedido ({cart.length}):
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="m-0 border-0 w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3 text-left font-medium text-gray-600">Insumo</th>
                    <th className="py-2 px-3 text-center w-24 font-medium text-gray-600">Cantidad</th>
                    <th className="py-2 px-3 w-20 font-medium text-gray-600">Unidad</th>
                    <th className="py-2 px-3 text-right w-28 font-medium text-gray-500">Ref. estimado</th>
                    <th className="py-2 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((c, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="py-2 px-3 font-medium text-gray-800">{c.producto}</td>
                      <td className="py-2 px-3 text-center font-semibold bg-gray-50">{c.cantidad}</td>
                      <td className="py-2 px-3 text-gray-500 text-xs">{c.unidad}</td>
                      <td className="py-2 px-3 text-right text-xs text-gray-400">
                        {c.precio_ref > 0 ? fmt(c.precio_ref * c.cantidad) : '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-600 font-bold text-lg leading-none">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {cart.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan="3" className="py-2 px-3 text-xs text-gray-500">{cart.length} insumos</td>
                      <td className="py-2 px-3 text-right text-xs font-semibold text-gray-600">
                        Est. {fmt(cart.reduce((s, c) => s + (c.precio_ref * c.cantidad), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {saved && (
          <div className="alert alert-success mt-4">
            ✓ Pedido registrado correctamente. Folio: <strong>{lastFolio}</strong>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            className="btn btn-primary w-full sm:w-auto flex justify-center"
            onClick={save}
            disabled={mutBulk.isPending || obras.length === 0 || cart.length === 0}
          >
            {mutBulk.isPending
              ? 'Procesando...'
              : `Generar Orden de Compra (${cart.length} insumo${cart.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>

      {/* Historial agrupado por OC */}
      <OCHistorial
        pedidos={pedidos}
        isLoading={isLoadingPedidos}
        expandedOC={expandedOC}
        setExpandedOC={setExpandedOC}
      />
    </div>
  )
}

function OCHistorial({ pedidos, isLoading, expandedOC, setExpandedOC }) {
  // Group rows by folio
  const grupos = pedidos.reduce((acc, p) => {
    if (!acc[p.folio]) {
      acc[p.folio] = {
        folio: p.folio,
        fecha: p.fecha,
        proveedor: p.proveedor,
        obra_nombre: p.obra_nombre,
        obra_id: p.obra_id,
        notas: p.notas,
        items: []
      }
    }
    acc[p.folio].items.push(p)
    return acc
  }, {})

  const folios = Object.keys(grupos).sort((a, b) => b.localeCompare(a))

  const statusColor = (s) => {
    if (s === 'Recibido') return 'bg-green-100 text-green-700'
    if (s === 'Parcial')  return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-600'
  }

  const ocStatus = (items) => {
    const allRecibido = items.every(i => i.status === 'Recibido')
    const anyRecibido = items.some(i => i.status === 'Recibido' || i.status === 'Parcial')
    if (allRecibido) return 'Recibido'
    if (anyRecibido) return 'Parcial'
    return 'Pendiente'
  }

  const toggle = (folio) => setExpandedOC(prev => ({ ...prev, [folio]: !prev[folio] }))

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="card-title mb-0">Historial de Órdenes de Compra</div>
        <div className="text-xs text-gray-400">{folios.length} OC{folios.length !== 1 ? 's' : ''}</div>
      </div>

      {isLoading && pedidos.length === 0 && <Loader />}

      {!isLoading && folios.length === 0 && (
        <p className="text-center text-gray-400 py-6">No hay pedidos registrados</p>
      )}

      <div className="space-y-2">
        {folios.map(folio => {
          const oc = grupos[folio]
          const expanded = !!expandedOC[folio]
          const st = ocStatus(oc.items)
          return (
            <div key={folio} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* OC Header */}
              <button
                type="button"
                onClick={() => toggle(folio)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-gray-400 shrink-0">
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <span className="font-bold font-mono text-gray-700 text-sm w-24 shrink-0">{folio}</span>
                <span className="text-sm text-gray-500 shrink-0 w-24">{oc.fecha}</span>
                <span className="font-semibold text-gray-800 text-sm flex-1 truncate">{oc.proveedor}</span>
                <span className="text-sm text-gray-500 truncate hidden sm:block flex-1">{oc.obra_nombre || `Obra #${oc.obra_id}`}</span>
                <span className="text-xs text-gray-400 shrink-0">{oc.items.length} insumo{oc.items.length !== 1 ? 's' : ''}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${statusColor(st)}`}>{st}</span>
              </button>

              {/* Insumos detalle */}
              {expanded && (
                <div className="border-t border-gray-200 bg-white">
                  {oc.notas && (
                    <div className="px-4 py-2 text-xs text-gray-500 bg-blue-50 border-b border-blue-100">
                      <span className="font-medium">Notas:</span> {oc.notas}
                    </div>
                  )}
                  <table className="m-0 border-0 w-full text-sm">
                    <thead className="bg-gray-50/80 border-b border-gray-100">
                      <tr>
                        <th className="py-2 px-4 text-left font-medium text-gray-500 text-xs">Insumo</th>
                        <th className="py-2 px-4 text-center font-medium text-gray-500 text-xs w-28">Cantidad</th>
                        <th className="py-2 px-4 font-medium text-gray-500 text-xs w-20">Unidad</th>
                        <th className="py-2 px-4 text-center font-medium text-gray-500 text-xs w-28">Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oc.items.map(item => (
                        <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                          <td className="py-2 px-4 font-medium text-gray-800">
                            {item.producto}
                            {item.catalogo_obra_id && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">vinculado</span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-center font-semibold text-gray-700">{item.cantidad}</td>
                          <td className="py-2 px-4 text-gray-400 text-xs">{item.unidad}</td>
                          <td className="py-2 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(item.status || 'Pendiente')}`}>
                              {item.status || 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
