import { useState, useMemo } from 'react'
import { Loader } from '../components/Loader'
import { fmt, today } from '../lib/utils'
import { getGastos, createGasto, getObras, getCuentas } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const CATEGORIAS = ['Caja chica', 'Herramientas', 'Mano de obra']

export default function Gastos() {
  const queryClient = useQueryClient()
  const { data: gastos = [], isLoading: isLoadingGastos } = useQuery({ queryKey: ['gastos'], queryFn: getGastos })
  const { data: obras  = [], isLoading: isLoadingObras  } = useQuery({ queryKey: ['obras'],  queryFn: getObras  })
  const { data: cuentas = [] }                            = useQuery({ queryKey: ['cuentas'], queryFn: getCuentas })

  const [filtroObra, setFiltroObra] = useState('Todas')
  const [filtroQ,    setFiltroQ]    = useState('')
  const [form, setForm] = useState({ obra_id: '', categoria: 'Caja chica', concepto: '', monto: '', fecha: today(), cuenta_id: '' })
  const [saved, setSaved] = useState(false)

  const obraIdActual = form.obra_id || obras[0]?.id || ''

  const mutation = useMutation({
    mutationFn: createGasto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] })
      queryClient.invalidateQueries({ queryKey: ['avances_obras'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      setForm(p => ({ ...p, concepto: '', monto: '', fecha: today() }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err) => alert('Error al guardar: ' + err.message)
  })

  const save = () => {
    if (!form.concepto || !form.monto || !obraIdActual) return alert('Completa los campos obligatorios')
    mutation.mutate({
      obra_id:   obraIdActual,
      categoria: form.categoria,
      concepto:  form.concepto,
      monto:     parseFloat(form.monto),
      fecha:     form.fecha,
      cuenta_id: form.cuenta_id ? parseInt(form.cuenta_id) : null
    })
  }

  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      const matchObra = filtroObra === 'Todas' || g.obra_id == filtroObra
      const matchQ    = !filtroQ || g.concepto.toLowerCase().includes(filtroQ.toLowerCase())
      return matchObra && matchQ
    })
  }, [gastos, filtroObra, filtroQ])

  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + g.monto, 0)

  if ((isLoadingGastos || isLoadingObras) && gastos.length === 0) {
    return <div><div className="page-title">Gastos por obra</div><Loader /></div>
  }

  return (
    <div>
      <div className="page-title">Gastos por obra</div>
      <div className="page-sub">Caja chica, mano de obra y material no facturado</div>

      {/* Formulario de captura */}
      <div className="card">
        <div className="card-title">Registrar gasto</div>

        {obras.length === 0 && !isLoadingObras && (
          <div className="alert alert-info mb-3">Primero registra una Obra.</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="field">
            <label>Obra <span className="text-red-500">*</span></label>
            <select value={obraIdActual} onChange={e => setForm(p => ({ ...p, obra_id: e.target.value }))} disabled={obras.length === 0}>
              {obras.filter(o => o.status !== 'Archivada').map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Categoría <span className="text-red-500">*</span></label>
            <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field md:col-span-2">
            <label>Concepto / Descripción <span className="text-red-500">*</span></label>
            <input value={form.concepto} onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
              placeholder="Ej. Pago cuadrilla semana 1, Fletes varilla, Gasolina..." />
          </div>
          <div className="field">
            <label>Monto ($) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={form.monto}
              onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} placeholder="0.00" />
          </div>
          <div className="field">
            <label>Fecha <span className="text-red-500">*</span></label>
            <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
          </div>
          <div className="field">
            <label>Cargo a cuenta (Opcional)</label>
            <select value={form.cuenta_id} onChange={e => setForm(p => ({ ...p, cuenta_id: e.target.value }))}>
              <option value="">— Sin afectar cuenta —</option>
              {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        {saved && <div className="alert alert-success mt-3">✓ Gasto registrado.</div>}

        <div className="mt-3">
          <button className="btn btn-primary" onClick={save} disabled={mutation.isPending || obras.length === 0}>
            {mutation.isPending ? 'Registrando...' : 'Registrar gasto'}
          </button>
        </div>
      </div>

      {/* Filtros y tabla */}
      <div className="card">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <input
            className="flex-1 min-w-[160px] text-sm px-2.5 py-[7px] border border-gray-200 rounded-md outline-none focus:border-primary"
            placeholder="Buscar por concepto..."
            value={filtroQ}
            onChange={e => setFiltroQ(e.target.value)}
          />
          <select className="text-sm border border-gray-200 rounded-md px-2.5 py-[7px] outline-none focus:border-primary"
            value={filtroObra} onChange={e => setFiltroObra(e.target.value)}>
            <option value="Todas">Todas las obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
          {(filtroObra !== 'Todas' || filtroQ) && (
            <button className="text-xs text-gray-500 hover:text-gray-800 underline"
              onClick={() => { setFiltroObra('Todas'); setFiltroQ('') }}>
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Obra</th><th>Categoría</th><th>Concepto</th><th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map(g => (
                <tr key={g.id}>
                  <td className="whitespace-nowrap text-sm text-gray-500">{g.fecha}</td>
                  <td className="font-medium text-gray-800">{g.obra_nombre || `Obra #${g.obra_id}`}</td>
                  <td><span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">{g.categoria || 'Caja chica'}</span></td>
                  <td className="text-gray-700">{g.concepto}</td>
                  <td className="text-right font-semibold">{fmt(g.monto)}</td>
                </tr>
              ))}
              {gastosFiltrados.length === 0 && (
                <tr><td colSpan="5" className="text-center text-gray-400 py-6">
                  {gastos.length === 0 ? 'No hay gastos registrados.' : 'Sin resultados para el filtro actual.'}
                </td></tr>
              )}

            </tbody>
          </table>
        </div>

        {gastosFiltrados.length > 0 && (
          <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500 mr-3">{gastosFiltrados.length} registros</span>
            <span className="font-bold text-gray-900">{fmt(totalFiltrado)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
