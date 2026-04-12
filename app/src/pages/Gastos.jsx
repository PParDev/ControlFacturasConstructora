import { useState, useEffect } from 'react'
import { CatBadge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { fmt, today } from '../lib/utils'
import { getGastos, createGasto, getObras } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const EMPTY = { obra_id: '', cat: 'Material', concepto: '', monto: '', fecha: today() }

export default function Gastos() {
  const queryClient = useQueryClient()
  const { data: gastos = [], isLoading: isLoadingGastos } = useQuery({ queryKey: ['gastos'], queryFn: getGastos })
  const { data: obras = [], isLoading: isLoadingObras } = useQuery({ queryKey: ['obras'], queryFn: getObras })
  
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(false)

  const isLoading = isLoadingGastos || isLoadingObras

  // Pre-fill
  useEffect(() => {
    if (obras.length > 0 && !form.obra_id) {
      setForm(f => ({ ...f, obra_id: obras[0].id }))
    }
  }, [obras, form.obra_id])

  const mutation = useMutation({
    mutationFn: createGasto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] })
      setForm(p => ({ ...p, concepto: '', monto: '' }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err) => {
      console.error(err)
    }
  })

  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  
  const save = () => {
    if (!form.concepto || !form.monto || !form.obra_id) return
    mutation.mutate({
      ...form,
      monto: parseFloat(form.monto)
    })
  }

  if (isLoading && gastos.length === 0) {
    return (
      <div>
        <div className="page-title">Gastos por obra</div>
        <div className="page-sub">Material, mano de obra y caja chica</div>
        <Loader />
      </div>
    )
  }

  // Calculate metrics
  const matTotal = gastos.filter(g => g.cat === 'Material').reduce((s, g) => s + g.monto, 0)
  const moTotal  = gastos.filter(g => g.cat === 'Mano de obra').reduce((s, g) => s + g.monto, 0)
  const ccTotal  = gastos.filter(g => g.cat === 'Caja chica').reduce((s, g) => s + g.monto, 0)
  const total = matTotal + moTotal + ccTotal || 1

  return (
    <div>
      <div className="page-title">Gastos por obra</div>
      <div className="page-sub">Material, mano de obra y caja chica</div>

      {/* Métricas por categoría */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="metric-card">
          <div className="metric-label">Material</div>
          <div className="metric-value">{fmt(matTotal)}</div>
          <div className="metric-sub">~{((matTotal / total) * 100).toFixed(0)}% del gasto</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Mano de obra</div>
          <div className="metric-value">{fmt(moTotal)}</div>
          <div className="metric-sub">~{((moTotal / total) * 100).toFixed(0)}% del gasto</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Caja chica</div>
          <div className="metric-value">{fmt(ccTotal)}</div>
          <div className="metric-sub">~{((ccTotal / total) * 100).toFixed(0)}% del gasto</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Registrar gasto</div>
        
        {obras.length === 0 && !isLoadingObras && (
          <div className="alert alert-info mb-3">Primero debe registrar una Obra para poder asignarle gastos.</div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="field">
            <label>Obra</label>
            <select value={form.obra_id} onChange={set('obra_id')} disabled={obras.length === 0}>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Categoría</label>
            <select value={form.cat} onChange={set('cat')}>
              <option>Material</option>
              <option>Mano de obra</option>
              <option>Caja chica</option>
            </select>
          </div>
          <div className="field">
            <label>Concepto</label>
            <input value={form.concepto} onChange={set('concepto')} placeholder="Ej. Pago cuadrilla" />
          </div>
          <div className="field">
            <label>Monto</label>
            <input type="number" value={form.monto} onChange={set('monto')} placeholder="3,500" />
          </div>
        </div>
        {saved && <div className="alert alert-success mt-3">✓ Gasto registrado exitosamente.</div>}
        <div className="mt-3">
          <button className="btn btn-primary" onClick={save} disabled={mutation.isPending || obras.length === 0}>
            {mutation.isPending ? 'Registrando...' : 'Registrar gasto'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Últimos gastos</div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Obra ID</th><th>Categoría</th><th>Concepto</th><th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => (
                <tr key={g.id}>
                  <td>{g.fecha}</td>
                  <td>{obras.find(o => o.id === g.obra_id)?.nombre || `Obra #${g.obra_id}`}</td>
                  <td><CatBadge s={g.cat} /></td>
                  <td>{g.concepto}</td><td>{fmt(g.monto)}</td>
                </tr>
              ))}
              {gastos.length === 0 && !isLoadingGastos && (
                <tr><td colSpan="5" className="text-center text-gray-400">No hay gastos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
