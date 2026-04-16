import { useState } from 'react'
import { Badge } from '../components/Badge'
import { FlowIndicator } from '../components/FlowIndicator'
import { Loader } from '../components/Loader'
import { fmt, today } from '../lib/utils'
import { getPagos, createPago, getFacturas, getObras } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const FLOW = [
  { label: 'Recepción', done: true },
  { label: 'Factura', done: true },
  { label: 'Pago', active: true },
]

export default function Pagos() {
  const queryClient = useQueryClient()

  const { data: pagos = [], isLoading: loadPagos } = useQuery({ queryKey: ['pagos'], queryFn: getPagos })
  const { data: allFacts = [], isLoading: loadFacts } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })
  const { data: obras = [] } = useQuery({ queryKey: ['obras'], queryFn: getObras })

  const [factura_id, setFacturaId] = useState('')
  const [monto, setMonto] = useState('')
  const [forma, setForma] = useState('Transferencia')
  const [referencia, setReferencia] = useState('')
  const [fecha, setFecha] = useState(today())
  const [saved, setSaved] = useState(false)

  const pendientes = allFacts.filter(f => f.status === 'Pendiente')
  const actFac = pendientes.find(f => f.id == factura_id) || pendientes[0]

  const mutation = useMutation({
    mutationFn: createPago,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setFacturaId('')
      setMonto('')
      setReferencia('')
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    },
    onError: err => alert(err.message)
  })

  const save = () => {
    const fid = parseInt(factura_id || actFac?.id)
    const m = parseFloat(monto)
    if (!fid) return alert('Selecciona una factura')
    if (!m || m <= 0) return alert('Ingresa el monto pagado')
    mutation.mutate({ factura_id: fid, monto: m, forma, referencia, fecha })
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
            <div className="text-2xl">💰</div>
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
              <label className="field-label block mb-2 text-sm font-medium text-gray-700">Selecciona la factura a pagar</label>
              <select 
                value={factura_id} 
                onChange={(e) => {
                  const fid = e.target.value;
                  setFacturaId(fid);
                  const selected = pendientes.find(f => f.id == fid);
                  if (selected) setMonto(selected.monto.toString());
                }}
                className="w-full border-gray-200 focus:border-primary focus:ring-primary rounded-lg transition-colors"
                disabled={pendientes.length === 0}
              >
                <option value="" disabled>Selecciona una factura pendiente...</option>
                {pendientes.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.folio} | {f.proveedor} | {f.obra_nombre} — {fmt(f.monto)}
                  </option>
                ))}
              </select>
              {factura_id && actFac && (
                <div className="mt-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex justify-between items-center animate-in fade-in slide-in-from-top-1">
                  <div>
                    <div className="text-xs text-blue-600 font-semibold uppercase">Factura Seleccionada</div>
                    <div className="text-sm font-bold text-gray-800">{actFac.folio} · {actFac.proveedor}</div>
                    <div className="text-[11px] text-gray-500">{actFac.obra_nombre} · {actFac.fecha}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total a pagar</div>
                    <div className="text-lg font-black text-primary">{fmt(actFac.monto)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="field">
                <label>Monto pagado</label>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
                  placeholder={actFac ? fmt(actFac.monto) : '0'} />
                {actFac && parseFloat(monto) > 0 && parseFloat(monto) < actFac.monto && (
                  <div className="text-xs text-orange-600 mt-0.5">⚠ Pago parcial — quedará {fmt(actFac.monto - parseFloat(monto))} pendiente</div>
                )}
              </div>
              <div className="field">
                <label>Forma de pago</label>
                <select value={forma} onChange={e => setForma(e.target.value)}>
                  <option>Transferencia</option>
                  <option>Cheque</option>
                  <option>Efectivo</option>
                  <option>Tarjeta Crédito</option>
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
                {mutation.isPending ? 'Registrando...' : 'Confirmar Pago'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Historial */}
      <div className="card">
        <div className="card-title">Historial de pagos</div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Folio Factura</th><th>Proveedor</th>
                <th>Obra</th><th className="text-right">Monto</th><th>Forma</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map(p => {
                const fac = allFacts.find(f => f.id === p.factura_id)
                return (
                  <tr key={p.id}>
                    <td className="text-sm">{p.fecha}</td>
                    <td className="font-mono text-xs text-gray-500">{fac?.folio || `#${p.factura_id}`}</td>
                    <td className="font-medium text-gray-800">{fac?.proveedor || '—'}</td>
                    <td className="text-gray-600 text-sm">{fac?.obra_nombre || obras.find(o => o.id === fac?.obra_id)?.nombre || '—'}</td>
                    <td className="text-right font-semibold text-emerald-700">{fmt(p.monto)}</td>
                    <td className="text-gray-600 text-sm">{p.forma || p.forma_pago}</td>
                    <td><Badge s="Pagada" /></td>
                  </tr>
                )
              })}
              {pagos.length === 0 && (
                <tr><td colSpan="7" className="text-center text-gray-400">No hay pagos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
