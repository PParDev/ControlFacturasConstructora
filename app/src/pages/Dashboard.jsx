import { Badge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { fmt } from '../lib/utils'
import { getDashboard, getObras, getFacturas, getAPI } from '../lib/api'
import { useQuery } from '@tanstack/react-query'

const BAR_COLORS = ['#185FA5', '#1D9E75', '#BA7517', '#993556', '#5b2c6f']

export default function Dashboard() {
  const { data: dash = {}, isLoading: loadDash } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
  const { data: obras = [], isLoading: loadObr } = useQuery({ queryKey: ['obras'], queryFn: getObras })
  const { data: facturas = [], isLoading: loadFact } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })

  // Avance presupuestal por obra: suma de detalles_factura vs presupuesto del catálogo
  const { data: avances = [] } = useQuery({
    queryKey: ['avances_obras'],
    queryFn: () => getAPI('/api/reportes/avances-obras'),
    enabled: obras.length > 0
  })

  const isLoading = loadDash || loadObr || loadFact

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
  const activeObras = obras.filter(o => o.status === 'Activa')

  return (
    <div>
      <div className="page-title">Dashboard</div>
      <div className="page-sub">Resumen ejecutivo del sistema</div>

      {/* ── Métricas principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <div className="metric-card">
          <div className="metric-label">Obras activas</div>
          <div className="metric-value">{dash.obras_activas || 0}</div>
          <div className="metric-sub">en ejecución</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Por pagar</div>
          <div className="metric-value text-red-600">{fmt(dash.facturas_pendientes_total || 0)}</div>
          <div className="metric-sub">{dash.facturas_pendientes_count || 0} factura(s)</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Bancos</div>
          <div className="metric-value text-emerald-600">{fmt(dash.saldo_cheques || 0)}</div>
          <div className="metric-sub">Cheques / Petty Cash</div>
        </div>
        <div className="metric-card border-l-4 border-primary">
          <div className="metric-label">Liquidez Neta</div>
          <div className={`metric-value ${dash.saldo_cheques - dash.deuda_credito < 0 ? 'text-red-600' : 'text-primary'}`}>
            {fmt(dash.saldo_cheques - dash.deuda_credito)}
          </div>
          <div className="metric-sub">Saldo - Uso Tarjeta</div>
        </div>
      </div>

      {/* ── Alertas de variación de precios ── */}
      {dash.alertas_precio && dash.alertas_precio.length > 0 && (
        <div className="card border border-red-200 bg-red-50/30 mb-4">
          <div className="card-title text-red-600 flex items-center gap-2">
            ⚠ Alertas de variación de precio ({dash.alertas_precio.length})
          </div>
          <table>
            <thead>
              <tr>
                <th>Material</th><th>Obra</th><th>Factura</th>
                <th className="text-right">Precio pres.</th>
                <th className="text-right">Precio real</th>
                <th className="text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {dash.alertas_precio.map((a, i) => {
                const diferencia = a.nuevo_precio - a.precio_referencia
                const pct = ((diferencia / a.precio_referencia) * 100).toFixed(1)
                return (
                  <tr key={i} className="bg-red-50/40">
                    <td className="font-medium text-gray-800">{a.material}</td>
                    <td className="text-gray-600">{a.obra}</td>
                    <td className="font-mono text-xs text-gray-500">{a.factura_folio}</td>
                    <td className="text-right">{fmt(a.precio_referencia)}</td>
                    <td className="text-right text-red-600 font-bold">{fmt(a.nuevo_precio)}</td>
                    <td className="text-right text-red-600 font-semibold">+{fmt(diferencia)} (+{pct}%)</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Avance Presupuestal por Obra ── */}
      {activeObras.length > 0 && (
        <div className="card mb-4">
          <div className="card-title">Avance presupuestal por obra</div>
          <div className="grid gap-4">
            {activeObras.map((o, i) => {
              const av = avances.find(a => a.obra_id === o.id)
              const presupuesto = av?.presupuesto_total || 0
              const gastado = av?.gasto_real || 0
              const pct = presupuesto > 0 ? Math.min((gastado / presupuesto) * 100, 100) : 0
              const sobrePres = gastado > presupuesto && presupuesto > 0
              const color = BAR_COLORS[i % BAR_COLORS.length]

              return (
                <div key={o.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <div>
                      <span className="font-semibold text-gray-800">{o.nombre}</span>
                      <span className="text-gray-400 text-xs ml-2">{o.cliente}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${sobrePres ? 'text-red-600' : 'text-gray-800'}`}>{fmt(gastado)}</span>
                      <span className="text-gray-400 text-xs"> / {fmt(presupuesto)}</span>
                      {presupuesto > 0 && (
                        <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${sobrePres ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                          {pct.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: sobrePres ? '#dc2626' : color
                      }}
                    />
                  </div>
                  {presupuesto === 0 && (
                    <div className="text-xs text-gray-400 mt-0.5">Sin catálogo de presupuesto cargado</div>
                  )}
                  {sobrePres && (
                    <div className="text-xs text-red-500 mt-0.5">⚠ Sobrepresupuesto por {fmt(gastado - presupuesto)}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5 mb-0">
        {/* Facturas pendientes de pago */}
        <div className="card">
          <div className="card-title">Facturas por pagar</div>
          <table>
            <thead>
              <tr><th>Folio</th><th>Proveedor</th><th>Obra</th><th>Monto</th></tr>
            </thead>
            <tbody>
              {pendingFacturas.slice(0, 5).map(f => (
                <tr key={f.id}>
                  <td className="font-mono text-xs text-gray-500">{f.folio}</td>
                  <td className="font-medium text-gray-700">{f.proveedor}</td>
                  <td className="text-gray-600 text-sm">{f.obra_nombre}</td>
                  <td><span className="text-warning font-semibold">{fmt(f.monto)}</span></td>
                </tr>
              ))}
              {pendingFacturas.length === 0 && (
                <tr><td colSpan="4" className="text-center text-emerald-600 font-medium">✓ Sin facturas pendientes</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top obras por gasto */}
        <div className="card">
          <div className="card-title">Gasto total por obra</div>
          {obras.slice(0, 5).map((o, i) => {
            const gastado = facturas.filter(f => f.obra_id === o.id).reduce((s, f) => s + f.monto, 0)
            const maxG = Math.max(...obras.map(ob => facturas.filter(f => f.obra_id === ob.id).reduce((s, f) => s + f.monto, 0)), 1)
            return (
              <div key={o.id} className="mb-3">
                <div className="flex justify-between text-sm mb-0.5">
                  <span className="text-gray-700">{o.nombre}</span>
                  <span className="font-medium">{fmt(gastado)}</span>
                </div>
                <div className="h-[6px] bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(gastado / maxG * 100).toFixed(0)}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                </div>
              </div>
            )
          })}
          {obras.length === 0 && <div className="text-sm text-gray-400">No hay obras</div>}
        </div>
      </div>
    </div>
  )
}
