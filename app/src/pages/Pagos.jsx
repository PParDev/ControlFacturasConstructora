import { useState, useEffect } from 'react'
import { Banknote } from 'lucide-react'
import { Badge } from '../components/Badge'
import { FlowIndicator } from '../components/FlowIndicator'
import { Loader } from '../components/Loader'
import { Paginador } from '../components/Paginador'
import { fmt, today } from '../lib/utils'
import { getPagos, createPago, getFacturas, getObras, getCuentas } from '../lib/api'
import { toast } from '../lib/toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'

const FLOW = [
  { label: 'Recepción', done: true },
  { label: 'Factura', done: true },
  { label: 'Pago', active: true },
]

export default function Pagos() {
  const queryClient = useQueryClient()
  const location = useLocation()

  const { data: pagos = [], isLoading: loadPagos } = useQuery({ queryKey: ['pagos'], queryFn: getPagos })
  const { data: allFacts = [], isLoading: loadFacts } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })
  const { data: cuentas = [] } = useQuery({ queryKey: ['cuentas'], queryFn: getCuentas })

  const [factura_id, setFacturaId] = useState('')
  const [cuenta_id, setCuentaId] = useState('')
  const [referencia, setReferencia] = useState('')
  const [fecha, setFecha] = useState(today())
  const [saved, setSaved] = useState(false)
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const pendientes = allFacts.filter(f => f.status === 'Pendiente')
  const actFac = pendientes.find(f => f.id == factura_id) || pendientes[0]

  // Set default cuenta (cheques)
  useEffect(() => {
    if (cuentas.length > 0 && !cuenta_id) {
      const cheques = cuentas.find(c => c.tipo === 'Cheques') || cuentas[0]
      setCuentaId(String(cheques.id))
    }
  }, [cuentas, cuenta_id])

  useEffect(() => {
    if (pendientes.length > 0 && location.state?.factura_id && factura_id !== location.state.factura_id) {
      const selected = pendientes.find(f => f.id == location.state.factura_id)
      if (selected) {
        setFacturaId(selected.id)
        window.history.replaceState({}, document.title)
      }
    }
  }, [pendientes, location.state, factura_id])

  const mutation = useMutation({
    mutationFn: createPago,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setFacturaId('')
      setReferencia('')
      setSaved(true)

      setTimeout(() => setSaved(false), 4000)
    },
    onError: err => toast.error(err.message)
  })

  const save = () => {
    const fid = parseInt(factura_id || actFac?.id)
    if (!fid) { toast.error('Selecciona una factura'); return }
    mutation.mutate({
      factura_id: fid,
      referencia,
      fecha,
      cuenta_id: cuenta_id ? parseInt(cuenta_id) : null
    })
  }

  const totalPendiente = pendientes.reduce((s, f) => s + f.monto, 0)

  if ((loadPagos || loadFacts) && pagos.length === 0) {
    return <div><div className="page-title">Pagos</div><Loader /></div>
  }

  return (
    <div>
      <div className="page-title">Pagos a proveedores</div>
      <div className="page-sub">Cierra el ciclo: Recepción → Factura → Pago</div>
      <FlowIndicator steps={FLOW} />

      {/* Alerta de pendientes */}
      {pendientes.length > 0 && (
        <div className="card border border-yellow-200 bg-yellow-50/60 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-yellow-800">
                {pendientes.length} factura{pendientes.length > 1 ? 's' : ''} pendiente{pendientes.length > 1 ? 's' : ''} de pago
              </div>
              <div className="text-sm text-yellow-700 mt-0.5">
                Total por liquidar: <strong>{fmt(totalPendiente)}</strong>
              </div>
            </div>
            <Banknote size={24} className="text-yellow-600 shrink-0" />
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="card">
        <div className="card-title">Registrar pago</div>

        {pendientes.length === 0 && !loadFacts ? (
          <div className="alert alert-info">No hay facturas pendientes de pago. ¡Todas están al corriente! ✓</div>
        ) : (
          <>
            {/* Selección de factura */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">Selecciona la factura a pagar</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {pendientes.map(f => {
                  const selected = String(f.id) === String(factura_id) || (!factura_id && f.id === actFac?.id)
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFacturaId(String(f.id))}
                      className={`text-left p-3 rounded-lg border-2 transition-all ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-xs font-bold font-mono ${selected ? 'text-primary' : 'text-gray-500'}`}>{f.folio}</span>
                            {selected && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-semibold">Seleccionada</span>}
                          </div>
                          <div className="text-sm font-semibold text-gray-900 truncate">{f.proveedor}</div>
                          <div className="text-xs text-gray-400 truncate">{f.obra_nombre} · {f.fecha}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-gray-400 mb-0.5">Por pagar</div>
                          <div className={`text-base font-black ${selected ? 'text-primary' : 'text-gray-700'}`}>{fmt(f.monto)}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Monto a pagar — solo informativo */}
            {actFac && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="text-sm text-emerald-700">Monto a pagar:</div>
                <div className="text-xl font-black text-emerald-700">{fmt(actFac.monto)}</div>
                <div className="text-xs text-emerald-600 ml-auto">(pago completo de la factura)</div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="field">
                <label>Cargo a cuenta</label>
                <select value={cuenta_id} onChange={e => setCuentaId(e.target.value)}>
                  <option value="">— Sin afectar cuenta —</option>
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Referencia / No. operación</label>
                <input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="field">
                <label>Fecha del pago</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
            </div>

            {saved && <div className="alert alert-success mt-3">✓ Pago registrado. La factura quedó marcada como Pagada.</div>}

            <div className="mt-4">
              <button className="btn btn-primary" onClick={save} disabled={mutation.isPending || pendientes.length === 0}>
                {mutation.isPending ? 'Registrando...' : `Confirmar Pago${actFac ? ' — ' + fmt(actFac.monto) : ''}`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Historial */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title mb-0">Historial de pagos</div>
          <div className="text-xs text-gray-400">{pagos.length} en total</div>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Folio Factura</th><th>Proveedor</th>
                <th>Obra</th><th className="text-right">Monto</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pagos.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(p => {
                const fac = allFacts.find(f => f.id === p.factura_id)
                return (
                  <tr key={p.id}>
                    <td className="text-sm">{p.fecha}</td>
                    <td className="font-mono text-xs text-gray-500">{fac?.folio || p.folio || `#${p.factura_id}`}</td>
                    <td className="font-medium text-gray-800">{fac?.proveedor || p.proveedor || '—'}</td>
                    <td className="text-gray-600 text-sm">{fac?.obra_nombre || p.obra_nombre || '—'}</td>
                    <td className="text-right font-semibold text-emerald-700">{fmt(p.monto)}</td>
                    <td><Badge s="Pagada" /></td>
                  </tr>
                )
              })}
              {pagos.length === 0 && (
                <tr><td colSpan="6" className="text-center text-gray-400">No hay pagos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginador total={pagos.length} page={page} perPage={PER_PAGE} onChange={p => setPage(p)} />
      </div>
    </div>
  )
}
