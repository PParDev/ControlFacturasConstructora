import { useState, useEffect, useMemo } from 'react'
import { Badge } from '../components/Badge'
import { FlowIndicator } from '../components/FlowIndicator'
import { Loader } from '../components/Loader'
import { Paginador } from '../components/Paginador'
import { getFacturas, createFactura, getObras, getCuentas, getRecepcionesPendientes, getRecepcion, getAPI, createCatalogo } from '../lib/api'
import { toast } from '../lib/toast'
import { fmt, today } from '../lib/utils'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'

const FLOW = [
  { label: 'Recepción', done: true },
  { label: 'Factura', active: true },
  { label: 'Pago' },
]

export default function Facturas() {
  const queryClient = useQueryClient()

  const { data: facturas = [], isLoading: loadFact } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })
  const { data: obras = [], isLoading: loadObras } = useQuery({ queryKey: ['obras'], queryFn: getObras })
  const { data: cuentas = [], isLoading: loadCuentas } = useQuery({ queryKey: ['cuentas'], queryFn: getCuentas })
  // Ahora usamos Recepciones Pendientes en lugar de Pedidos
  const { data: recPendientes = [], isLoading: loadRecs } = useQuery({ queryKey: ['recepciones_pendientes'], queryFn: getRecepcionesPendientes })

  const [selectedObra, setSelectedObra] = useState('')
  const [folio_proveedor, setFolioProveedor] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [fecha, setFecha] = useState(today())
  
  // El folio de la remisión seleccionada (REC-XXX)
  const [folioSeleccionado, setFolioSeleccionado] = useState('')
  const [itemsBulk, setItemsBulk] = useState({})
  // Permite corregir o añadir vínculo al catálogo en caliente
  const [vinculosCorregidos, setVinculosCorregidos] = useState({})
  
  // Detalles "libres" o adicionales (ej fletes)
  const [detallesAdicionales, setDetallesAdicionales] = useState([])
  const [busqueda, setBusqueda] = useState({})
  
  const [saved, setSaved] = useState(false)
  const [pagoInmediato, setPagoInmediato] = useState(false)
  const [cuentaId, setCuentaId] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  // Modal insumo no previsto
  const [showModal, setShowModal] = useState(false)
  const [modalForm, setModalForm] = useState({ nombre: '', unidad: 'pza', precio_referencia: '' })

  const crearInsumMutation = useMutation({
    mutationFn: createCatalogo,
    onSuccess: (nuevo) => {
      queryClient.invalidateQueries({ queryKey: ['catalogo_obras', selectedObra] })
      setDetallesAdicionales(d => [...d, {
        catalogo_obra_id: nuevo.id,
        cantidad: 1,
        precio_unitario: nuevo.precio_referencia || 0
      }])
      setShowModal(false)
      setModalForm({ nombre: '', unidad: 'pza', precio_referencia: '' })
    },
    onError: err => toast.error(err.message)
  })

  const guardarNuevoInsumo = () => {
    if (!modalForm.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!selectedObra) { toast.error('Primero selecciona una obra'); return }
    crearInsumMutation.mutate({
      obra_id: parseInt(selectedObra),
      codigo: '',
      nombre: modalForm.nombre.trim(),
      unidad: modalForm.unidad || 'pza',
      cantidad_presupuestada: 0,
      precio_referencia: parseFloat(modalForm.precio_referencia) || 0
    })
  }

  const { data: catalogo = [], isLoading: loadCat } = useQuery({
    queryKey: ['catalogo_obras', selectedObra],
    queryFn: () => getAPI(`/api/catalogo?obra_id=${selectedObra}`),
    enabled: !!selectedObra
  })

  // Las recepciones pendientes ya vienen agrupadas del backend (cabecera + items)
  const gruposRecepcion = useMemo(() => {
    const obj = {}
    recPendientes.forEach(r => {
      obj[r.folio] = r
    })
    return obj
  }, [recPendientes])

  const foliosUnicos = Object.keys(gruposRecepcion).sort()

  const inicializarBulk = (items) => {
    const obj = {}
    items.forEach(i => obj[i.id] = i.precio_estimado || 0)
    setItemsBulk(obj)
    setVinculosCorregidos({}) // Resetear vínculos manuales de la UI
  }

  // Auto-cargar si venimos desde tablero o al inicio
  useEffect(() => {
    if (obras.length > 0 && !selectedObra) setSelectedObra(obras[0].id)
    
    // Si viene un folio por navegación (ej. desde el tablero)
    if (location.state?.folio && foliosUnicos.includes(location.state.folio)) {
      handleFolioSelect(location.state.folio)
      // Limpiar el estado para que no se re-seleccione al refrescar
      window.history.replaceState({}, document.title)
    } 
    else if (foliosUnicos.length > 0 && !folioSeleccionado) {
      handleFolioSelect(foliosUnicos[0])
    }
  }, [obras, foliosUnicos, location.state])

  const handleFolioSelect = (folioOrId) => {
    const f = folioOrId; // Es el string REC-XXX
    setFolioSeleccionado(f)
    if (gruposRecepcion[f]) {
      setSelectedObra(gruposRecepcion[f].obra_id)
      setProveedor(gruposRecepcion[f].proveedor)
      inicializarBulk(gruposRecepcion[f].items)
    }
    setDetallesAdicionales([])
  }

  const saveMutation = useMutation({
    mutationFn: createFactura,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['recepciones_pendientes'] })
      setFolioProveedor('')
      setProveedor('')
      setFecha(today())
      setFolioSeleccionado('')
      setDetallesAdicionales([])
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    },
    onError: (err) => toast.error(err.message)
  })

  // ---- Manejo de Detalles Adicionales ----
  const getCatFiltrado = (idx) => {
    const q = (busqueda[idx] || '').toLowerCase()
    if (!q) return catalogo
    return catalogo.filter(c =>
      c.nombre.toLowerCase().includes(q) || (c.codigo || '').toLowerCase().includes(q)
    )
  }

  const addDetalleAdicional = () => {
    if (!catalogo.length) { toast.warning('Esta obra no tiene catálogo'); return }
    setDetallesAdicionales(d => [...d, { catalogo_obra_id: catalogo[0].id, cantidad: 1, precio_unitario: catalogo[0].precio_referencia }])
    setBusqueda(b => ({ ...b, [detallesAdicionales.length]: '' }))
  }

  const updateDetalleAdi = (i, key, value) => {
    const next = [...detallesAdicionales]
    next[i] = { ...next[i], [key]: value }
    if (key === 'catalogo_obra_id') {
      const cat = catalogo.find(c => c.id == value)
      if (cat) next[i].precio_unitario = cat.precio_referencia
    }
    setDetallesAdicionales(next)
  }

  const removeDetalleAdi = (i) => setDetallesAdicionales(d => d.filter((_, idx) => idx !== i))

  // ---- Cálculo del Total ----
  const recActiva = folioSeleccionado ? gruposRecepcion[folioSeleccionado] : null
  
  const montoRecepciones = recActiva 
    ? recActiva.items.reduce((acc, item) => {
        const pUnitario = parseFloat(itemsBulk[item.id]) || 0;
        return acc + (item.cantidad_recibida * pUnitario);
      }, 0)
    : 0

  const montoAdicionales = detallesAdicionales.reduce((acc, d) =>
    acc + ((parseFloat(d.cantidad) || 0) * (parseFloat(d.precio_unitario) || 0)), 0)

  const montoTotal = montoRecepciones + montoAdicionales

  // ---- Guardar ----
  const save = () => {
    if (!selectedObra) { toast.error('Selecciona una obra'); return }
    if (!proveedor) { toast.error('Escribe el nombre del proveedor'); return }
    
    const detallesFinales = []
    let erroresVinculacion = false;
    
    // Meter las líneas de la recepción
    if (recActiva) {
      for (const item of recActiva.items) {
        const pUnit = parseFloat(itemsBulk[item.id]) || 0;
        if (pUnit > 0) {
          const catId = item.catalogo_obra_id || vinculosCorregidos[item.id]
          if (!catId) {
             toast.error(`El insumo "${item.producto}" no tiene vínculo con el catálogo. Asígnale uno antes de guardar.`);
             erroresVinculacion = true;
             break;
          }
          detallesFinales.push({
            catalogo_obra_id: parseInt(catId),
            cantidad: parseFloat(item.cantidad_recibida),
            precio_unitario: pUnit,
            subtotal: parseFloat(item.cantidad_recibida) * pUnit
          })
        }
      }
    }

    if (erroresVinculacion) return;

    // Meter las líneas adicionales
    detallesAdicionales.forEach(d => {
      const cant = parseFloat(d.cantidad)
      const pu = parseFloat(d.precio_unitario)
      if (cant > 0 && pu > 0) {
         detallesFinales.push({
            catalogo_obra_id: parseInt(d.catalogo_obra_id),
            cantidad: cant,
            precio_unitario: pu,
            subtotal: cant * pu
         })
      }
    })

    if (detallesFinales.length === 0) { toast.warning('Rellena los precios unitarios para facturar o agrega un concepto extra'); return }

    saveMutation.mutate({
      obra_id: parseInt(selectedObra),
      recepcion_id: recActiva ? recActiva.items[0].id : null, // Liga la factura con la primera recepción de este folio para trazabilidad
      folio_proveedor,
      proveedor,
      fecha,
      monto: montoTotal,
      pago_inmediato: pagoInmediato,
      cuenta_id: pagoInmediato ? parseInt(cuentaId) : null,
      detalles: detallesFinales
    })
  }

  if ((loadFact || loadObras || loadRecs) && facturas.length === 0) {
    return <div><div className="page-title">Facturas</div><Loader /></div>
  }

  return (
    <div>
      <div className="page-title">Facturas Administrativas</div>
      <div className="page-sub">Ingresa precios y vinculaciones basados en Entregas (Recepciones) físicas confirmadas.</div>
      <FlowIndicator steps={FLOW} />

      {/* ── Carga desde Recepciones Pendientes ── */}
      <div className="card border border-blue-200 bg-blue-50/60 mb-4">
        <div className="font-semibold text-blue-900 mb-1">
          Remisiones pendientes de facturar
        </div>
        <p className="text-sm text-blue-700/80 mb-3">
          Elige qué Recepción (carga física comprobada) quieres facturar hoy:
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="flex-1 min-w-[200px] border-blue-200 text-blue-900 bg-white font-medium text-sm rounded-lg py-2 px-3 outline-none focus:border-blue-400"
            onChange={(e) => handleFolioSelect(e.target.value)}
            value={folioSeleccionado}
          >
            <option value="" disabled>— Seleccionar Recepción Confirmada —</option>
            {foliosUnicos.map(f => (
              <option key={f} value={f}>
                {f} — {gruposRecepcion[f].proveedor} ({gruposRecepcion[f].items.length} insumos recibidos)
              </option>
            ))}
          </select>
          {foliosUnicos.length === 0 && (
             <div className="text-xs text-red-500 mt-1 font-medium bg-red-50 px-2 py-1 rounded">No hay recepciones físicas recientes sin facturar.</div>
          )}
        </div>
      </div>

      {/* ── Formulario de Factura ── */}
      <div className="card">
        <div className="card-title">Registrar nueva factura</div>

        {/* Datos generales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="field">
            <label>Obra</label>
            <select value={selectedObra} onChange={e => setSelectedObra(e.target.value)} disabled={!!recActiva}>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Proveedor <span className="text-red-500">*</span></label>
            <input value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Ej. El Toro Materiales" disabled={!!recActiva} />
          </div>
          <div className="field">
            <label>Folio del proveedor <span className="text-gray-400 font-normal">(factura real)</span></label>
            <input value={folio_proveedor} onChange={e => setFolioProveedor(e.target.value)} placeholder="Ej. A-00231" />
          </div>
          <div className="field">
            <label>Fecha de la factura</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
        </div>

        {/* Insumos base de la Recepción */}
        {recActiva && (
          <div className="border border-green-200 rounded-lg overflow-hidden bg-white mb-4">
            <div className="bg-green-50 px-3 py-2 border-b border-green-200 flex justify-between items-center text-sm">
               <span className="font-semibold text-green-800">
                  Conceptos recibidos físicamente en {recActiva.folio}:
               </span>
               <span className="text-green-700 text-xs">Completa el Precio Unitario de cada partida</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-green-50/50 text-gray-500 text-xs text-left">
                <tr>
                  <th className="py-2 px-3 font-medium">Concepto</th>
                  <th className="py-2 px-3 font-medium w-24">Vínculo Cat.</th>
                  <th className="py-2 px-3 font-medium w-24 text-right">Cant. Recibida</th>
                  <th className="py-2 px-3 font-medium w-36 text-right bg-blue-50/30">Precio Unitario ($)</th>
                  <th className="py-2 px-3 font-medium w-32 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {recActiva.items.map((item, idx) => {
                  const cant     = item.cantidad_recibida;
                  const pu       = parseFloat(itemsBulk[item.id]) || 0;
                  const subtotal = cant * pu;
                  const catId    = item.catalogo_obra_id || vinculosCorregidos[item.id]
                  const catItem  = catalogo.find(c => c.id == catId)
                  const pRef     = catItem?.precio_referencia || 0
                  const alerta   = pu > 0 && pRef > 0 && pu > pRef

                  return (
                    <tr key={item.id} className={`border-t border-gray-100 transition-colors ${alerta ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-gray-50/50'}`}>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-gray-700">{item.producto}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.catalogo_obra_id ? (
                          <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">✓ Vinculado</span>
                        ) : (
                          <select
                            className="text-[10px] sm:text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 outline-none rounded p-1 max-w-[120px] w-full"
                            value={vinculosCorregidos[item.id] || ''}
                            onChange={e => setVinculosCorregidos(prev => ({ ...prev, [item.id]: e.target.value }))}
                          >
                            <option value="" disabled>Seleccionar...</option>
                            {catalogo.map(c => (
                              <option key={c.id} value={c.id}>{c.codigo ? `[${c.codigo}] ` : ''}{c.nombre}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-600 bg-gray-50/30 text-right">
                        {cant}
                      </td>
                      <td className="py-1 px-2 border-l border-r border-blue-50 bg-blue-50/30">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          className={`w-full text-sm rounded shadow-sm py-1 text-right font-medium ${alerta ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                          value={itemsBulk[item.id] !== undefined ? itemsBulk[item.id] : ''}
                          onChange={e => setItemsBulk(prev => ({ ...prev, [item.id]: e.target.value }))}
                          tabIndex={idx + 1}
                        />
                        {alerta && (
                          <div className="text-[10px] text-red-600 mt-0.5 flex items-center gap-0.5 font-medium">
                            ⚠ Superior al catálogo ({fmt(pRef)})
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-700">
                        {fmt(subtotal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Partidas Libres / Extras */}
        <div className="flex items-center justify-between mb-2 mt-6">
          <div className="font-semibold text-gray-800 text-sm">Partidas o Recargos extra <span className="text-xs text-gray-400 font-normal">(Fletes, ajustes, etc.)</span></div>
          <div className="flex gap-2">
            <button
              className="btn text-xs py-1.5 px-3 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded"
              onClick={() => setShowModal(true)}
              disabled={!selectedObra}
              title="Crear un insumo que no estaba en el catálogo original"
            >
              + Crear insumo no previsto
            </button>
            <button className="btn btn-outline text-xs py-1.5 px-3" onClick={addDetalleAdicional} disabled={loadCat}>
              + Agregar fila libre
            </button>
          </div>
        </div>

        {detallesAdicionales.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Buscar / Concepto</th>
                  <th className="text-right py-2 px-3 w-24 font-medium text-gray-600">Cantidad</th>
                  <th className="text-right py-2 px-3 w-32 font-medium text-gray-600">Precio Unit.</th>
                  <th className="text-right py-2 px-3 w-28 font-medium text-gray-600">Subtotal</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {detallesAdicionales.map((d, i) => {
                  const catFiltrado = getCatFiltrado(i)
                  const catSelec    = catalogo.find(c => c.id == d.catalogo_obra_id)
                  const pRefAdi     = catSelec?.precio_referencia || 0
                  const alertaAdi   = parseFloat(d.precio_unitario) > 0 && pRefAdi > 0 && parseFloat(d.precio_unitario) > pRefAdi

                  return (
                    <tr key={i} className={`border-t border-gray-200 ${alertaAdi ? 'bg-red-50/30' : ''}`}>
                      <td className="py-2 px-3 space-y-1">
                        <input
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-1 focus:border-blue-400 outline-none"
                          placeholder="Buscar concepto..."
                          value={busqueda[i] || ''}
                          onChange={e => setBusqueda(b => ({ ...b, [i]: e.target.value }))}
                        />
                        <select
                          value={d.catalogo_obra_id}
                          onChange={e => { updateDetalleAdi(i, 'catalogo_obra_id', e.target.value); setBusqueda(b => ({ ...b, [i]: '' })) }}
                          className="w-full text-xs"
                          size={catFiltrado.length > 4 ? 4 : catFiltrado.length || 1}
                        >
                          {catFiltrado.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.codigo ? `[${c.codigo}] ` : ''}{c.nombre} ({c.unidad}) — ref: {fmt(c.precio_referencia)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" className="w-full text-right border border-gray-200 rounded px-2 py-1 text-sm focus:border-blue-400 outline-none" min="0" step="any"
                          value={d.cantidad} onChange={e => updateDetalleAdi(i, 'cantidad', e.target.value)} tabIndex={100 + i}/>
                      </td>
                      <td className="py-2 px-3">
                        <input type="number"
                          className={`w-full text-right border rounded px-2 py-1 text-sm outline-none ${alertaAdi ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-400'}`}
                          min="0" step="any"
                          value={d.precio_unitario} onChange={e => updateDetalleAdi(i, 'precio_unitario', e.target.value)} tabIndex={200 + i}/>
                        {alertaAdi && (
                          <div className="text-[10px] text-red-600 mt-0.5 font-medium">⚠ Superior al ref. ({fmt(pRefAdi)})</div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-800 bg-gray-50/70">
                        {fmt((parseFloat(d.cantidad) || 0) * (parseFloat(d.precio_unitario) || 0))}
                      </td>
                      <td className="px-2 text-center">
                        <button onClick={() => removeDetalleAdi(i)} className="text-red-400 hover:text-red-600 text-lg font-bold leading-none" title="Eliminar">×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Total y botón */}
        <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 mt-6">
          <span className="text-sm text-gray-500">{(recActiva ? recActiva.items.length : 0) + detallesAdicionales.length} partida(s) de cobro</span>
          <div>
            <span className="text-gray-500 text-sm mr-3">Total de la factura:</span>
            <span className="text-2xl font-bold text-gray-900">{fmt(montoTotal)}</span>
          </div>
        </div>

        {/* Pago Inmediato */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-5">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input 
              type="checkbox" 
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              checked={pagoInmediato}
              onChange={e => setPagoInmediato(e.target.checked)}
            />
            <div>
              <div className="font-semibold text-blue-900">Registrar Pago Inmediato (Contado)</div>
              <div className="text-sm text-blue-700/80">Marca esta casilla si pagaste ya la factura para no tener que ir a Pagos.</div>
            </div>
          </label>
          
          {pagoInmediato && (
            <div className="mt-4 pt-4 border-t border-blue-200/60">
              <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona de dónde salió el dinero:</label>
              <select 
                className="w-full md:w-1/2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                value={cuentaId}
                onChange={e => setCuentaId(e.target.value)}
              >
                <option value="" disabled>Selecciona una cuenta...</option>
                {cuentas.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} (Saldo: {fmt(c.saldo_actual)})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {saved && <div className="alert alert-success mb-3">✓ Factura administrativa registrada perfectamente.</div>}

        <button
          className="btn btn-primary"
          onClick={save}
          disabled={saveMutation.isPending || (pagoInmediato && !cuentaId)}
          tabIndex={300}
        >
          {saveMutation.isPending ? 'Guardando factura...' : (pagoInmediato ? 'Guardar y Archivar como Pagada' : 'Guardar Factura por Pagar')}
        </button>
      </div>

      {/* Modal: Insumo no previsto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100">
              <div className="font-semibold text-gray-800 text-base">Crear insumo no previsto</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Se dará de alta en el catálogo de esta obra con cantidad presupuestada = 0.
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="field">
                <label>Nombre del insumo <span className="text-red-500">*</span></label>
                <input
                  autoFocus
                  value={modalForm.nombre}
                  onChange={e => setModalForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Taza sanitaria marca X, Varilla 3/8 especial..."
                  onKeyDown={e => e.key === 'Enter' && guardarNuevoInsumo()}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label>Unidad</label>
                  <input
                    value={modalForm.unidad}
                    onChange={e => setModalForm(f => ({ ...f, unidad: e.target.value }))}
                    placeholder="pza, m3, kg..."
                  />
                </div>
                <div className="field">
                  <label>Precio ref. ($) <span className="text-gray-400 font-normal text-xs">(Opcional)</span></label>
                  <input
                    type="number" min="0" step="any"
                    value={modalForm.precio_referencia}
                    onChange={e => setModalForm(f => ({ ...f, precio_referencia: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button
                className="btn btn-primary flex-1"
                onClick={guardarNuevoInsumo}
                disabled={crearInsumMutation.isPending}
              >
                {crearInsumMutation.isPending ? 'Creando...' : 'Crear y agregar a factura'}
              </button>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title mb-0">Facturas registradas</div>
          <div className="text-xs text-gray-400">{facturas.length} almacenadas</div>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Identificador</th><th>Folio Real Proveedor</th><th>Proveedor</th>
                <th>Obra</th><th>Monto</th><th>Fecha del Doc.</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {facturas.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(f => (
                <tr key={f.id}>
                  <td className="font-mono text-xs text-gray-500">{f.folio}</td>
                  <td className="text-gray-700 font-medium">{f.folio_proveedor || '—'}</td>
                  <td>{f.proveedor}</td>
                  <td>{f.obra_nombre || `Obra #${f.obra_id}`}</td>
                  <td className="font-semibold">{fmt(f.monto)}</td>
                  <td className="text-gray-500">{f.fecha}</td>
                  <td><Badge s={f.status} /></td>
                </tr>
              ))}
              {facturas.length === 0 && (
                <tr><td colSpan="7" className="text-center text-gray-400">No hay facturas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginador total={facturas.length} page={page} perPage={PER_PAGE} onChange={p => setPage(p)} />
      </div>
    </div>
  )
}
