import { Badge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { fmt } from '../lib/utils'
import { getDashboard, getObras, getGastos, getFacturas } from '../lib/api'
import { useQuery } from '@tanstack/react-query'

const BAR_COLORS = ['#185FA5', '#1D9E75', '#BA7517', '#993556', '#5b2c6f']

export default function Dashboard() {
  const { data: dash = {}, isLoading: isLoadingDash } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
  const { data: obras = [], isLoading: isLoadingObr } = useQuery({ queryKey: ['obras'], queryFn: getObras })
  const { data: gastos = [], isLoading: isLoadingGast } = useQuery({ queryKey: ['gastos'], queryFn: getGastos })
  const { data: facturas = [], isLoading: isLoadingFact } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })

  const isLoading = isLoadingDash || isLoadingObr || isLoadingGast || isLoadingFact

  if (isLoading) {
    return (
      <div>
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Resumen general del sistema</div>
        <Loader />
      </div>
    )
  }

  const pendingFacturas = facturas.filter(f => f.status === 'Pendiente')
  const ultimosGastos = gastos.slice(0, 4)
  
  // Compute estimated gasto by obra for the chart
  const gastoPorObra = obras.map(o => {
    const _gastos = gastos.filter(g => g.obra_id === o.id).reduce((s, g) => s + g.monto, 0)
    return { ...o, gastoCalculado: _gastos }
  }).sort((a,b) => b.gastoCalculado - a.gastoCalculado).slice(0, 5)

  const maxGasto = Math.max(...gastoPorObra.map(o => o.gastoCalculado), 1)

  return (
    <div>
      <div className="page-title">Dashboard</div>
      <div className="page-sub">Resumen general del sistema</div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        <div className="metric-card">
          <div className="metric-label">Obras activas</div>
          <div className="metric-value">{dash.obras_activas || 0}</div>
          <div className="metric-sub">en ejecución</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Facturas por pagar</div>
          <div className="metric-value">{fmt(dash.facturas_pendientes_total || 0)}</div>
          <div className="metric-sub">{dash.facturas_pendientes_count || 0} facturas</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Saldo cheques</div>
          <div className="metric-value">{fmt(dash.saldo_cheques || 0)}</div>
          <div className="metric-sub">Actualizado</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Gasto del mes</div>
          <div className="metric-value">{fmt(dash.gasto_mes || 0)}</div>
          <div className="metric-sub">todas las obras</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 mb-0">
        {/* Últimos movimientos */}
        <div className="card">
          <div className="card-title">Últimos gastos y mov.</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Concepto</th><th>Obra ID</th><th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {ultimosGastos.map(g => (
                <tr key={g.id}>
                  <td>{g.fecha}</td>
                  <td className="truncate max-w-[120px]">{g.concepto}</td>
                  <td>Obra #{g.obra_id}</td>
                  <td>{fmt(g.monto)}</td>
                </tr>
              ))}
              {ultimosGastos.length === 0 && (
                <tr><td colSpan="4" className="text-center text-gray-400">Sin movimientos</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Gasto por obra */}
        <div className="card">
          <div className="card-title">Gasto registrado por obra (Top 5)</div>
          {gastoPorObra.map((o, i) => (
            <div key={o.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{o.nombre}</span>
                <span className="font-medium">{fmt(o.gastoCalculado)}</span>
              </div>
              <div className="h-[7px] rounded-full bg-gray-100 mb-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(o.gastoCalculado / maxGasto * 100).toFixed(0)}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
                />
              </div>
            </div>
          ))}
          {gastoPorObra.length === 0 && (
             <div className="text-sm text-gray-400">No hay datos de obras</div>
          )}
        </div>
      </div>

      {/* Facturas pendientes */}
      <div className="card">
        <div className="card-title">Facturas pendientes de pago</div>
        <table>
          <thead>
            <tr><th>Folio</th><th>Proveedor</th><th>Obra ID</th><th>Monto</th><th>Estatus</th></tr>
          </thead>
          <tbody>
            {pendingFacturas.map(f => (
              <tr key={f.id}>
                <td>{f.folio}</td><td>{f.proveedor}</td><td>{f.obra_id}</td>
                <td>{fmt(f.monto)}</td><td><Badge s={f.status} /></td>
              </tr>
            ))}
            {pendingFacturas.length === 0 && (
              <tr><td colSpan="5" className="text-center text-gray-400">Sin facturas pendientes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
