import { useState, useMemo } from 'react'
import { CatBadge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { fmt, today } from '../lib/utils'
import { getGastos, createGasto, getObras } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const CATEGORIAS = ['Material', 'Mano de obra', 'Caja chica', 'Equipo / Herramienta', 'Otro']

export default function Gastos() {
  const queryClient = useQueryClient()
  const { data: gastos = [], isLoading: isLoadingGastos } = useQuery({ queryKey: ['gastos'], queryFn: getGastos })
  const { data: obras = [], isLoading: isLoadingObras } = useQuery({ queryKey: ['obras'], queryFn: getObras })

  // Filtros de vista
  const [filtroObra, setFiltroObra] = useState('Todas')
  const [filtroCat,  setFiltroCat]  = useState('Todas')
  const [filtroQ,    setFiltroQ]    = useState('')

  // Formulario
  const [form, setForm] = useState({ obra_id: '', cat: 'Material', concepto: '', monto: '', fecha: today() })
  const [saved, setSaved] = useState(false)

  // Pre-fill obra
  const obraIdActual = form.obra_id || obras[0]?.id || ''

  const mutation = useMutation({
    mutationFn: createGasto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] })
      queryClient.invalidateQueries({ queryKey: ['avances_obras'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setForm(p => ({ ...p, concepto: '', monto: '', fecha: today() }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err) => alert('Error al guardar: ' + err.message)
  })

  const save = () => {
    if (!form.concepto || !form.monto || !obraIdActual) return alert('Completa los campos obligatorios')
    mutation.mutate({ ...form, obra_id: obraIdActual, monto: parseFloat(form.monto) })
  }

  // Gastos filtrados
  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      const matchObra = filtroObra === 'Todas' || g.obra_id == filtroObra
      const matchCat  = filtroCat  === 'Todas' || g.cat === filtroCat
      const matchQ    = !filtroQ   || g.concepto.toLowerCase().includes(filtroQ.toLowerCase())
      return matchObra && matchCat && matchQ
    })
  }, [gastos, filtroObra, filtroCat, filtroQ])

  // Métricas de los gastos filtrados
  const matTotal = gastosFiltrados.filter(g => g.cat === 'Material').reduce((s, g) => s + g.monto, 0)
  const moTotal  = gastosFiltrados.filter(g => g.cat === 'Mano de obra').reduce((s, g) => s + g.monto, 0)
  const ccTotal  = gastosFiltrados.filter(g => g.cat === 'Caja chica').reduce((s, g) => s + g.monto, 0)
  const otrosTotal = gastosFiltrados.filter(g => !['Material','Mano de obra','Caja chica'].includes(g.cat)).reduce((s, g) => s + g.monto, 0)
  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + g.monto, 0)

  if ((isLoadingGastos || isLoadingObras) && gastos.length === 0) {
    return <div><div className="page-title">Gastos por obra</div><Loader /></div>
  }

  return (
    <div>
      <div className="page-title">Gastos por obra</div>
      <div className="page-sub">Caja chica, mano de obra y material no facturado</div>

      {/* ── Métricas del filtro actual ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <div className="metric-card">
          <div className="metric-label">Material</div>
          <div className="metric-value">{fmt(matTotal)}</div>
          <div className="metric-sub">{totalFiltrado > 0 ? ((matTotal/totalFiltrado)*100).toFixed(0) : 0}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Mano de obra</div>
          <div className="metric-value">{fmt(moTotal)}</div>
          <div className="metric-sub">{totalFiltrado > 0 ? ((moTotal/totalFiltrado)*100).toFixed(0) : 0}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Caja chica</div>
          <div className="metric-value">{fmt(ccTotal)}</div>
          <div className="metric-sub">{totalFiltrado > 0 ? ((ccTotal/totalFiltrado)*100).toFixed(0) : 0}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total ({gastosFiltrados.length})</div>
          <div className="metric-value text-primary">{fmt(totalFiltrado)}</div>
          <div className="metric-sub">{filtroObra !== 'Todas' ? obras.find(o=>o.id==filtroObra)?.nombre : 'Todas las obras'}</div>
        </div>
      </div>

      {/* ── Formulario de captura ── */}
      <div className="card">
        <div className="card-title">Registrar gasto</div>

        {obras.length === 0 && !isLoadingObras && (
          <div className="alert alert-info mb-3">Primero registra una Obra.</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="field">
            <label>Obra <span className="text-red-500">*</span></label>
            <select value={obraIdActual} onChange={e => setForm(p => ({...p, obra_id: e.target.value}))} disabled={obras.length === 0}>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Categoría</label>
            <select value={form.cat} onChange={e => setForm(p => ({...p, cat: e.target.value}))}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Fecha <span className="text-red-500">*</span></label>
            <input type="date" value={form.fecha} onChange={e => setForm(p => ({...p, fecha: e.target.value}))} />
          </div>
          <div className="field md:col-span-2">
            <label>Concepto / Descripción <span className="text-red-500">*</span></label>
            <input value={form.concepto} onChange={e => setForm(p => ({...p, concepto: e.target.value}))}
              placeholder="Ej. Pago cuadrilla semana 1, Fletes varilla, Gasolina..." />
          </div>
          <div className="field">
            <label>Monto ($) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={form.monto} onChange={e => setForm(p => ({...p, monto: e.target.value}))} placeholder="0.00" />
          </div>
        </div>

        {saved && <div className="alert alert-success mt-3">✓ Gasto registrado.</div>}

        <div className="mt-3">
          <button className="btn btn-primary" onClick={save} disabled={mutation.isPending || obras.length === 0}>
            {mutation.isPending ? 'Registrando...' : 'Registrar gasto'}
          </button>
        </div>
      </div>

      {/* ── Filtros de la tabla ── */}
      <div className="card">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <input
            className="flex-1 min-w-[160px] text-sm px-2.5 py-[7px] border border-gray-200 rounded-md outline-none focus:border-primary transition-colors"
            placeholder="🔍 Buscar por concepto..."
            value={filtroQ}
            onChange={e => setFiltroQ(e.target.value)}
          />
          <select className="text-sm border border-gray-200 rounded-md px-2.5 py-[7px] outline-none focus:border-primary"
            value={filtroObra} onChange={e => setFiltroObra(e.target.value)}>
            <option value="Todas">Todas las obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
          <select className="text-sm border border-gray-200 rounded-md px-2.5 py-[7px] outline-none focus:border-primary"
            value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
            <option value="Todas">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          {(filtroObra !== 'Todas' || filtroCat !== 'Todas' || filtroQ) && (
            <button className="text-xs text-gray-500 hover:text-gray-800 underline"
              onClick={() => { setFiltroObra('Todas'); setFiltroCat('Todas'); setFiltroQ('') }}>
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
                  <td className="font-medium text-gray-800">{obras.find(o => o.id === g.obra_id)?.nombre || `Obra #${g.obra_id}`}</td>
                  <td><CatBadge s={g.cat} /></td>
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
