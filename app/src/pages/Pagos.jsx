import { useState, useEffect } from 'react'
import { Badge } from '../components/Badge'
import { FlowIndicator } from '../components/FlowIndicator'
import { Loader } from '../components/Loader'
import { fmt, today } from '../lib/utils'
import { getPagos, createPago, getFacturas, getObras } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const FLOW = [
  { label: 'Recepción', done: true   },
  { label: 'Factura',   done: true   },
  { label: 'Pago',      active: true },
]

const EMPTY = { factura_id: '', monto: '', formapago: 'Transferencia', referencia: '', fecha: today() }

export default function Pagos() {
  const queryClient = useQueryClient()

  const { data: pagos = [], isLoading: loadPagos } = useQuery({ queryKey: ['pagos'], queryFn: getPagos })
  const { data: allFacts = [], isLoading: loadFacts } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })
  const { data: obras = [], isLoading: loadObras } = useQuery({ queryKey: ['obras'], queryFn: getObras })

  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(false)

  const isLoading = loadPagos || loadFacts || loadObras
  const facturas = allFacts.filter(f => f.status === 'Pendiente')

  useEffect(() => {
    if (facturas.length > 0 && !form.factura_id) {
      setForm(f => ({ ...f, factura_id: facturas[0].id }))
    }
  }, [facturas, form.factura_id])

  const mutation = useMutation({
    mutationFn: createPago,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      setForm(p => ({ ...p, monto: '', referencia: '' }))
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    },
    onError: (err) => {
      console.error(err)
    }
  })

  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const actFac = facturas.find(f => f.id == form.factura_id)
  
  const save = () => {
    if (!form.factura_id || !form.monto || !form.formapago) return
    
    mutation.mutate({
      factura_id: parseInt(form.factura_id),
      monto: parseFloat(form.monto),
      forma: form.formapago,
      referencia: form.referencia,
      fecha: form.fecha
    })
  }

  if (isLoading && pagos.length === 0) {
    return (
      <div>
        <div className="page-title">Pagos</div>
        <div className="page-sub">Registro de pagos a proveedores</div>
        <FlowIndicator steps={FLOW} />
        <Loader />
      </div>
    )
  }

  return (
    <div>
      <div className="page-title">Pagos</div>
      <div className="page-sub">Registro de pagos a proveedores</div>

      <FlowIndicator steps={FLOW} />

      <div className="card">
        <div className="card-title">Registrar pago</div>
        
        {facturas.length === 0 && !loadFacts && (
          <div className="alert alert-info mb-3">No hay facturas pendientes de pago registradas.</div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="field">
            <label>Factura pendiente</label>
            <select value={form.factura_id} onChange={set('factura_id')} disabled={facturas.length === 0}>
              {facturas.map(f => (
                <option key={f.id} value={f.id}>{f.folio} — {f.proveedor} ({fmt(f.monto)})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monto pagado</label>
            <input
              type="number" 
              value={form.monto} 
              onChange={e => { setForm(f => ({ ...f, monto: e.target.value })); setSaved(false) }}
              placeholder={actFac ? actFac.monto.toString() : ""}
            />
          </div>
          <div className="field">
            <label>Forma de pago</label>
            <select value={form.formapago} onChange={set('formapago')}>
              <option>Transferencia</option>
              <option>Cheque</option>
              <option>Efectivo</option>
              <option>Tarjeta Crédito</option>
            </select>
          </div>
          <div className="field">
            <label>Referencia</label>
            <input value={form.referencia} onChange={set('referencia')} placeholder="No. transferencia o cheque" />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={form.fecha} onChange={set('fecha')} />
          </div>
        </div>

        {saved && (
          <div className="alert alert-success mt-3">✓ Pago registrado correctamente.</div>
        )}
        <div className="mt-3">
          <button className="btn btn-primary" onClick={save} disabled={mutation.isPending || facturas.length === 0}>
            {mutation.isPending ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Historial de pagos</div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Factura ID</th><th>Proveedor</th>
                <th>Obra</th><th>Monto</th><th>Forma</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map(p => {
                return (
                  <tr key={p.id}>
                    <td>{p.fecha}</td>
                    <td className="font-medium text-gray-700">Factura #{p.factura_id}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>{fmt(p.monto)}</td>
                    <td>{p.forma}</td><td><Badge s="Pagado" /></td>
                  </tr>
                )
              })}
              {pagos.length === 0 && !loadPagos && (
                <tr><td colSpan="7" className="text-center text-gray-400">No hay pagos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
