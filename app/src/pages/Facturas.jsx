import { useState, useEffect } from 'react'
import { Badge } from '../components/Badge'
import { FlowIndicator } from '../components/FlowIndicator'
import { Loader } from '../components/Loader'
import { getFacturas, createFactura, getObras, getAPI } from '../lib/api'
import { fmt, today } from '../lib/utils'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'

const FLOW = [
  { label: 'Recepción', done: true },
  { label: 'Factura', active: true },
  { label: 'Pago' },
]

export default function Facturas() {
  const queryClient = useQueryClient()

  const { data: facturas = [], isLoading: loadFact } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })
  const { data: obras = [], isLoading: loadObras } = useQuery({ queryKey: ['obras'], queryFn: getObras })

  const [selectedObra, setSelectedObra] = useState('')
  const [folio_proveedor, setFolioProveedor] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [fecha, setFecha] = useState(today())
  const [detalles, setDetalles] = useState([])
  const [busqueda, setBusqueda] = useState({})
  const [saved, setSaved] = useState(false)

  const { data: catalogo = [], isLoading: loadCat } = useQuery({
    queryKey: ['catalogo_obras', selectedObra],
    queryFn: () => getAPI(`/api/catalogo?obra_id=${selectedObra}`),
    enabled: !!selectedObra
  })

  useEffect(() => {
    if (obras.length > 0 && !selectedObra) setSelectedObra(obras[0].id)
  }, [obras])

  useEffect(() => { setDetalles([]) }, [selectedObra])

  const saveMutation = useMutation({
    mutationFn: createFactura,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      setFolioProveedor('')
      setProveedor('')
      setFecha(today())
      setDetalles([])
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    },
    onError: (err) => alert('Error: ' + err.message)
  })

  // Catálogo filtrado para búsqueda inline por fila
  const getCatFiltrado = (idx) => {
    const q = (busqueda[idx] || '').toLowerCase()
    if (!q) return catalogo
    return catalogo.filter(c =>
      c.nombre.toLowerCase().includes(q) || (c.codigo || '').toLowerCase().includes(q)
    )
  }

  const addDetalle = () => {
    if (!catalogo.length) return alert('Esta obra no tiene catálogo. Importa un Excel en la sección Obras.')
    setDetalles(d => [...d, { catalogo_obra_id: catalogo[0].id, cantidad: 1, precio_unitario: catalogo[0].precio_referencia }])
    setBusqueda(b => ({ ...b, [detalles.length]: '' }))
  }

  const updateDetalle = (i, key, value) => {
    const next = [...detalles]
    next[i] = { ...next[i], [key]: value }
    if (key === 'catalogo_obra_id') {
      const cat = catalogo.find(c => c.id == value)
      if (cat) next[i].precio_unitario = cat.precio_referencia
    }
    setDetalles(next)
  }

  const removeDetalle = (i) => setDetalles(d => d.filter((_, idx) => idx !== i))

  const montoTotal = detalles.reduce((acc, d) =>
    acc + ((parseFloat(d.cantidad) || 0) * (parseFloat(d.precio_unitario) || 0)), 0)

  const save = () => {
    if (!selectedObra) return alert('Selecciona una obra')
    if (!proveedor) return alert('Escribe el nombre del proveedor')
    if (detalles.length === 0) return alert('Agrega al menos un concepto a la factura')

    saveMutation.mutate({
      obra_id: parseInt(selectedObra),
      folio_proveedor,
      proveedor,
      fecha,
      monto: montoTotal,
      detalles: detalles.map(d => ({
        catalogo_obra_id: parseInt(d.catalogo_obra_id),
        cantidad: parseFloat(d.cantidad),
        precio_unitario: parseFloat(d.precio_unitario),
        subtotal: parseFloat(d.cantidad) * parseFloat(d.precio_unitario)
      }))
    })
  }

  if ((loadFact || loadObras) && facturas.length === 0) {
    return <div><div className="page-title">Facturas</div><Loader /></div>
  }

  return (
    <div>
      <div className="page-title">Facturas</div>
      <div className="page-sub">Captura detallada por conceptos del catálogo de la obra</div>
      <FlowIndicator steps={FLOW} />

      {/* ── Formulario de captura ── */}
      <div className="card">
        <div className="card-title">Registrar nueva factura</div>

        {/* Datos generales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="field">
            <label>Obra</label>
            <select value={selectedObra} onChange={e => setSelectedObra(e.target.value)}>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Proveedor <span className="text-red-500">*</span></label>
            <input value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Ej. El Toro Materiales" />
          </div>
          <div className="field">
            <label>Folio del proveedor (Opcional)</label>
            <input value={folio_proveedor} onChange={e => setFolioProveedor(e.target.value)} placeholder="Ej. A-00231" />
          </div>
          <div className="field">
            <label>Fecha de la factura</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
        </div>

        {/* Aviso de folio automático */}
        <div className="alert alert-info mb-4 text-sm">
          📋 El folio interno se genera automáticamente (FAC-2026-0001). Registra el folio del proveedor si lo tienes.
        </div>

        {/* Partidas / Insumos */}
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-gray-800 text-sm">Partidas / Insumos de la factura</div>
          <button className="btn btn-primary text-xs py-1.5 px-3" onClick={addDetalle} disabled={loadCat}>
            + Agregar concepto
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          {detalles.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 bg-gray-50">
              Haz clic en <strong>+ Agregar concepto</strong> para ir capturando los insumos de la factura.<br />
              <span className="text-xs text-gray-400">Asegúrate de que la obra tiene un catálogo importado.</span>
            </div>
          ) : (
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
                {detalles.map((d, i) => {
                  const catFiltrado = getCatFiltrado(i)
                  const precioRef = catalogo.find(c => c.id == d.catalogo_obra_id)?.precio_referencia || 0
                  const precioReal = parseFloat(d.precio_unitario) || 0
                  const sobrePrecio = precioReal > precioRef * 1.001 // tolerancia 0.1%

                  return (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="py-2 px-3 space-y-1">
                        <input
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-1 focus:border-blue-400 outline-none"
                          placeholder="🔍 Buscar concepto..."
                          value={busqueda[i] || ''}
                          onChange={e => setBusqueda(b => ({ ...b, [i]: e.target.value }))}
                        />
                        <select
                          value={d.catalogo_obra_id}
                          onChange={e => { updateDetalle(i, 'catalogo_obra_id', e.target.value); setBusqueda(b => ({ ...b, [i]: '' })) }}
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
                          value={d.cantidad} onChange={e => updateDetalle(i, 'cantidad', e.target.value)} />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" className={`w-full text-right border rounded px-2 py-1 text-sm focus:outline-none ${sobrePrecio ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500' : 'border-gray-200 focus:border-blue-400'}`}
                          min="0" step="any"
                          value={d.precio_unitario} onChange={e => updateDetalle(i, 'precio_unitario', e.target.value)} />
                        {sobrePrecio && (
                          <div className="text-red-500 text-[10px] mt-0.5">⚠ Sobre precio ref. {fmt(precioRef)}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-800 bg-gray-50/70">
                        {fmt((parseFloat(d.cantidad) || 0) * (parseFloat(d.precio_unitario) || 0))}
                      </td>
                      <td className="px-2 text-center">
                        <button onClick={() => removeDetalle(i)} className="text-red-400 hover:text-red-600 text-lg font-bold leading-none" title="Eliminar">×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Total y botón */}
        <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
          <span className="text-sm text-gray-500">{detalles.length} partida(s)</span>
          <div>
            <span className="text-gray-500 text-sm mr-3">Total de la factura:</span>
            <span className="text-2xl font-bold text-gray-900">{fmt(montoTotal)}</span>
          </div>
        </div>

        {saved && <div className="alert alert-success mb-3">✓ Factura registrada correctamente.</div>}

        <button
          className="btn btn-primary"
          onClick={save}
          disabled={saveMutation.isPending || detalles.length === 0}
        >
          {saveMutation.isPending ? 'Guardando...' : 'Guardar Factura'}
        </button>
      </div>

      {/* ── Historial ── */}
      <div className="card">
        <div className="card-title">Facturas registradas</div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Folio Sistema</th><th>Folio Proveedor</th><th>Proveedor</th>
                <th>Obra</th><th>Monto</th><th>Fecha</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map(f => (
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
      </div>
    </div>
  )
}
