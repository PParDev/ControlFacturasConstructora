import { useState, useEffect, useMemo } from 'react'
import { FlowIndicator } from '../components/FlowIndicator'
import { getRecepciones, createRecepcion, createRecepcionBulk, getObras, getPedidos, getCatalogo } from '../lib/api'
import { Loader } from '../components/Loader'
import { Paginador } from '../components/Paginador'
import { fmt, today } from '../lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'

const FLUJOS = [
  { title: 'Con pedido previo',  desc: 'Se hizo orden de compra antes'   },
  { title: 'Sin pedido formal',  desc: 'El proveedor ya sabía qué traer' },
]

const FLOWS = [
  [
    { label: 'Pedido OC', done: true   },
    { label: 'Recepción', active: true },
    { label: 'Factura'  },
    { label: 'Pago'     },
  ],
  [
    { label: 'Sin pedido', optional: true },
    { label: 'Recepción',  active: true   },
    { label: 'Factura' },
    { label: 'Pago'    },
  ],
]

const EMPTY = {
  obra_id: '', proveedor: '', producto: '', catalogo_obra_id: '',
  cantidad_recibida: '', entregado_por: '', recibido_por: '',
  fecha: today()
}

export default function Recepcion() {
  const queryClient = useQueryClient()
  const location    = useLocation()

  const { data: recepciones = [], isLoading: loadRec   } = useQuery({ queryKey: ['recepciones'], queryFn: getRecepciones })
  const { data: obras       = [], isLoading: loadObras  } = useQuery({ queryKey: ['obras'],       queryFn: getObras })
  const { data: allPedidos  = [], isLoading: loadPeds   } = useQuery({ queryKey: ['pedidos'],     queryFn: getPedidos })

  const [flujo,     setFlujo]     = useState(0)
  const [form,      setForm]      = useState(EMPTY)
  const [saved,     setSaved]     = useState(false)
  const [lastFolio, setLastFolio] = useState('')
  const [busqCat,   setBusqCat]   = useState('')
  const [page,      setPage]      = useState(1)
  
  // Para flujo con pedido:
  const [folioSeleccionado, setFolioSeleccionado] = useState('')
  const [bulkItems, setBulkItems] = useState({}) // { pedido_id: cantidad_recibida }

  const PER_PAGE = 10

  const { data: catalogo = [], isLoading: loadCat } = useQuery({
    queryKey: ['catalogo', form.obra_id],
    queryFn:  () => getCatalogo(form.obra_id),
    enabled:  !!form.obra_id && flujo !== 0
  })

  const pedidos = useMemo(() => allPedidos.filter(p => p.status !== 'Recibido'), [allPedidos])

  // Agrupar pedidos por folio para el select
  const gruposOC = useMemo(() => {
    return pedidos.reduce((acc, p) => {
      if (!acc[p.folio]) {
        acc[p.folio] = { 
          folio: p.folio, 
          obra_id: p.obra_id, 
          proveedor: p.proveedor, 
          items: [] 
        }
      }
      acc[p.folio].items.push(p)
      return acc
    }, {})
  }, [pedidos])
  
  const foliosUnicos = Object.keys(gruposOC).sort()

  // Efecto 1: pre-cargar desde el Kanban o lista de compras
  useEffect(() => {
    if (!location.state?.pedido_folio || Object.keys(gruposOC).length === 0) return
    const folio = location.state.pedido_folio
    if (gruposOC[folio]) {
      setFolioSeleccionado(folio)
      inicializarBulk(gruposOC[folio].items)
      window.history.replaceState({}, document.title)
    }
  }, [gruposOC, location.state?.pedido_folio]) // eslint-disable-line

  // Efecto 2: preseleccionar Obra por defecto en flujo "Sin Pedido"
  useEffect(() => {
    if (obras.length > 0 && !form.obra_id) {
      setForm(f => ({ ...f, obra_id: obras[0].id }))
    }
    // Preseleccionar primer folio si no hay nada
    if (flujo === 0 && foliosUnicos.length > 0 && !folioSeleccionado) {
      const folio = foliosUnicos[0]
      setFolioSeleccionado(folio)
      inicializarBulk(gruposOC[folio].items)
    }
  }, [obras, foliosUnicos, flujo])

  const inicializarBulk = (items) => {
    const obj = {}
    items.forEach(i => obj[i.id] = i.cantidad) // Por defecto sugerir cantidad total pedida
    setBulkItems(obj)
    setSaved(false)
  }

  const handleFolioSelect = (e) => {
    const f = e.target.value
    setFolioSeleccionado(f)
    if (gruposOC[f]) {
      inicializarBulk(gruposOC[f].items)
    }
  }

  const mutSingle = useMutation({
    mutationFn: createRecepcion,
    onSuccess: (res) => handleSuccess(res.folio),
    onError: (err) => alert('Error: ' + err.message)
  })

  const mutBulk = useMutation({
    mutationFn: createRecepcionBulk,
    onSuccess: (res) => handleSuccess(res.length > 0 ? res[0].folio : ''),
    onError: (err) => alert('Error: ' + err.message)
  })

  const handleSuccess = (folio) => {
    queryClient.invalidateQueries({ queryKey: ['recepciones'] })
    queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    setLastFolio(folio)
    if (flujo === 1) {
      setForm(f => ({ ...f, producto: '', cantidad_recibida: '', catalogo_obra_id: '' }))
      setBusqCat('')
    } else {
      setFolioSeleccionado('')
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 5000)
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleCatSelect = (c) => {
    setForm(f => ({ ...f, catalogo_obra_id: c.id, producto: c.nombre }))
    setBusqCat('')
  }

  const catFiltrado = busqCat
    ? catalogo.filter(c =>
        c.nombre.toLowerCase().includes(busqCat.toLowerCase()) ||
        (c.codigo || '').toLowerCase().includes(busqCat.toLowerCase())
      )
    : catalogo

  const insumoSel = catalogo.find(c => c.id == form.catalogo_obra_id)

  const ocActiva = folioSeleccionado ? gruposOC[folioSeleccionado] : null

  const save = () => {
    if (flujo === 1) {
      if (!form.obra_id || !form.producto) return alert('Completa la obra y el producto')
      mutSingle.mutate({
        ...form,
        cantidad_recibida: parseFloat(form.cantidad_recibida),
        pedido_id: null,
        catalogo_obra_id: form.catalogo_obra_id || null
      })
    } else {
      if (!ocActiva) return alert('Selecciona una orden de compra')
      
      const payload = ocActiva.items
        .filter(item => {
          const qty = parseFloat(bulkItems[item.id])
          return !isNaN(qty) && qty > 0
        })
        .map(item => ({
          obra_id: ocActiva.obra_id,
          proveedor: ocActiva.proveedor,
          pedido_id: item.id,
          producto: item.producto,
          cantidad_recibida: parseFloat(bulkItems[item.id]),
          catalogo_obra_id: item.catalogo_obra_id,
          entregado_por: form.entregado_por,
          recibido_por: form.recibido_por,
          fecha: form.fecha,
          tipo_flujo: 'con_pedido'
        }))

      if (payload.length === 0) return alert('Ingresa cantidad para al menos un insumo')
      mutBulk.mutate(payload)
    }
  }

  const isPending = mutSingle.isPending || mutBulk.isPending
  const isLoading = loadRec || loadObras || loadPeds

  if (isLoading && recepciones.length === 0) {
    return (
      <div>
        <div className="page-title">Entregas en obra (Recepción)</div>
        <div className="page-sub pb-2">Registra lo que llegó realmente a la obra</div>
        <Loader />
      </div>
    )
  }

  return (
    <div>
      <div className="page-title">Entregas en obra (Recepción)</div>
      <div className="page-sub pb-2">
        Registra lo que llegó realmente a la obra — <span className="text-blue-600 font-semibold">(Paso Opcional)</span>
      </div>

      <div className="alert alert-info mt-2 mb-4">
        Este paso es <strong>opcional</strong>. Puedes registrar la recepción para verificar que llegó el material, o pasar directamente a <strong>Facturas</strong>.
      </div>

      <div className="card">
        <div className="card-title">¿Cómo llegó este material?</div>

        {/* Selector de flujo */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {FLUJOS.map((f, i) => (
            <div
              key={i}
              className={`flow-option ${flujo === i ? 'flow-option-sel' : ''}`}
              onClick={() => { setFlujo(i); setSaved(false); setBusqCat('') }}
            >
              <div className="text-sm font-medium text-gray-900 mb-1">{f.title}</div>
              <div className="text-xs text-gray-500">{f.desc}</div>
            </div>
          ))}
        </div>

        <FlowIndicator steps={FLOWS[flujo]} />

        {/* ── FLUJO CON PEDIDO (MASIVO) ── */}
        {flujo === 0 && (
          <div className="mb-4 mt-2">
            <div className="field mb-3">
              <label>Orden de compra (Folio OC)</label>
              <select value={folioSeleccionado} onChange={handleFolioSelect} disabled={foliosUnicos.length === 0}>
                {foliosUnicos.map(f => (
                  <option key={f} value={f}>
                    {f} — {gruposOC[f].proveedor} ({gruposOC[f].items.length} insumos)
                  </option>
                ))}
              </select>
              {foliosUnicos.length === 0 && !loadPeds && (
                <div className="text-xs text-red-500 mt-1">No hay órdenes pendientes para enlazar.</div>
              )}
            </div>

            {ocActiva && (
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white mt-4">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-sm font-semibold text-gray-700">
                  Insumos a recibir en esta orden:
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs text-left">
                    <tr>
                      <th className="py-2 px-3 font-medium">Producto</th>
                      <th className="py-2 px-3 font-medium w-24 border-r border-gray-200 text-center">Referencia</th>
                      <th className="py-2 px-3 font-medium w-24">Cant. Pedida</th>
                      <th className="py-2 px-3 font-medium w-32 bg-blue-50/50">Recibiendo hoy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocActiva.items.map((item, idx) => {
                      const recibido = parseFloat(bulkItems[item.id]) || 0
                      const pedida = item.cantidad
                      const incompleto = recibido > 0 && recibido < pedida
                      
                      return (
                        <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2 px-3">
                            <span className="font-semibold text-gray-700">{item.producto}</span>
                            <div className="text-xs text-gray-400">{item.unidad}</div>
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 text-center">
                            {item.catalogo_obra_id 
                              ? <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">✓ Vinc</span>
                              : <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">⚠ Ciego</span>}
                          </td>
                          <td className="py-2 px-3 font-medium text-gray-600 bg-gray-50/30">
                            {pedida}
                          </td>
                          <td className="py-1 px-2 bg-blue-50/20">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="w-full text-sm border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1"
                              value={bulkItems[item.id] !== undefined ? bulkItems[item.id] : ''}
                              onChange={e => setBulkItems(prev => ({ ...prev, [item.id]: e.target.value }))}
                              tabIndex={idx + 1}
                            />
                            {incompleto && <div className="text-[10px] text-orange-500 mt-0.5 leading-tight">Merma documentada</div>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── FLUJO SIN PEDIDO ── */}
        {flujo === 1 && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="field">
              <label>Obra</label>
              <select value={form.obra_id} onChange={set('obra_id')} disabled={obras.length === 0}>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
            
            <div className="field">
              <label>Proveedor</label>
              <input value={form.proveedor} onChange={set('proveedor')} placeholder="Nombre del proveedor" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Insumo del catálogo <span className="text-gray-400">(opcional, recomendado)</span>
              </label>
              {loadCat ? (
                <p className="text-xs text-gray-400">Cargando catálogo...</p>
              ) : catalogo.length === 0 ? (
                <p className="text-xs text-orange-500">Esta obra no tiene catálogo.</p>
              ) : (
                <>
                  <input
                    className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-[7px] outline-none focus:border-blue-400 mb-1"
                    placeholder="Buscar en catálogo (opcional)..."
                    value={busqCat}
                    onChange={e => { setBusqCat(e.target.value); if (!e.target.value) setForm(f => ({ ...f, catalogo_obra_id: '' })) }}
                  />
                  {busqCat && (
                    <div className="border border-gray-200 rounded-md overflow-hidden max-h-36 overflow-y-auto mb-1">
                      {catFiltrado.slice(0, 8).map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleCatSelect(c)}
                          className={`flex justify-between px-3 py-1.5 text-sm cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50`}
                        >
                          <span>{c.nombre}</span>
                          <span className="text-xs text-gray-400">{c.unidad}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {insumoSel && (
                    <div className="flex items-center justify-between text-xs bg-green-50 text-green-700 border border-green-200 rounded-md px-3 py-1.5">
                      <span><strong>Vinculado:</strong> {insumoSel.nombre}</span>
                      <button onClick={() => { setForm(f => ({ ...f, catalogo_obra_id: '', producto: '' })); setBusqCat('') }} className="text-green-500 ml-2">×</button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="field">
              <label>Producto / material libre</label>
              <input value={form.producto} onChange={set('producto')} placeholder="Ej. Blocks 15×20" disabled={!!insumoSel} />
            </div>
            
            <div className="field">
              <label>Cantidad recibida</label>
              <input type="number" value={form.cantidad_recibida} onChange={set('cantidad_recibida')} />
            </div>
          </div>
        )}

        {/* Datos comunes de entrega (Chófer, fecha, etc) */}
        <div className="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-gray-100">
          <div className="field">
            <label>Quién entregó (chofer, fact.)</label>
            <input value={form.entregado_por} onChange={set('entregado_por')} placeholder="Chofer / Proveedor" tabIndex={100} />
          </div>
          <div className="field">
            <label>Quién recibió en obra</label>
            <input value={form.recibido_por} onChange={set('recibido_por')} placeholder="Encargado de obra" tabIndex={101} />
          </div>
        </div>

        {saved && (
          <div className="alert alert-success mt-4">
            ✓ Recepción guardada correctamente con folio <strong>{lastFolio}</strong>.
          </div>
        )}

        <div className="mt-4">
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={isPending || (flujo === 0 && foliosUnicos.length === 0)}
            tabIndex={102}
          >
            {isPending ? 'Procesando...' : 'Confirmar Recepción de Materiales'}
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title mb-0">Recepciones recientes</div>
          <div className="text-xs text-gray-400">{recepciones.length} filas</div>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Folio</th><th>Fecha</th><th>Obra</th>
                <th>Producto</th><th>Recibido</th><th>Proveedor</th><th>Ref</th>
              </tr>
            </thead>
            <tbody>
              {recepciones.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(r => (
                <tr key={r.id}>
                  <td className="font-medium text-gray-700">{r.folio}</td>
                  <td>{r.fecha}</td>
                  <td>{obras.find(o => o.id === r.obra_id)?.nombre || `Obra #${r.obra_id}`}</td>
                  <td>{r.producto}</td>
                  <td className="font-semibold text-gray-700">{r.cantidad_recibida}</td>
                  <td>{r.proveedor}</td>
                  <td>
                    {r.catalogo_obra_id
                      ? <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-medium">Vinculado</span>
                      : <span className="text-[10px] text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
              {recepciones.length === 0 && !loadRec && (
                <tr><td colSpan="7" className="text-center text-gray-400">No hay recepciones registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginador total={recepciones.length} page={page} perPage={PER_PAGE} onChange={p => setPage(p)} />
      </div>
    </div>
  )
}
