import { useParams, useNavigate } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { Badge } from '../components/Badge'
import { fmt } from '../lib/utils'
import { getObra, getFacturas, getGastos, getPedidos } from '../lib/api'
import { useQuery } from '@tanstack/react-query'

export default function ObraDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: obra, isLoading: loadObra } = useQuery({
    queryKey: ['obra', id],
    queryFn: () => getObra(id),
    enabled: !!id
  })
  const { data: allFacts = [] } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })
  const { data: allGastos = [] } = useQuery({ queryKey: ['gastos'], queryFn: getGastos })
  const { data: allPedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: getPedidos })

  const facturas = allFacts.filter(f => f.obra_id == id)
  const gastos   = allGastos.filter(g => g.obra_id == id)
  const pedidos  = allPedidos.filter(p => p.obra_id == id)

  const totalFacturado = facturas.reduce((s, f) => s + f.monto, 0)
  const totalGastos    = gastos.reduce((s, g) => s + g.monto, 0)
  const totalGastado   = totalFacturado + totalGastos
  const presupuesto    = obra?.presupuesto_total || 0
  const pct            = presupuesto > 0 ? Math.min((totalGastado / presupuesto) * 100, 100) : 0
  const sobre          = presupuesto > 0 && totalGastado > presupuesto

  if (loadObra) {
    return <div><div className="page-title">Detalle de Obra</div><Loader /></div>
  }

  if (!obra) {
    return (
      <div>
        <button className="btn mb-4" onClick={() => navigate('/obras')}>← Volver a Obras</button>
        <div className="card text-center py-10 text-gray-400">Obra no encontrada.</div>
      </div>
    )
  }

  // Group pedidos by folio
  const pedidosPorFolio = pedidos.reduce((acc, p) => {
    if (!acc[p.folio]) acc[p.folio] = []
    acc[p.folio].push(p)
    return acc
  }, {})

  return (
    <div>
      <button
        className="text-sm text-gray-500 hover:text-gray-800 mb-4 flex items-center gap-1"
        onClick={() => navigate('/obras')}
      >
        ← Volver a Obras
      </button>

      {/* Encabezado */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="page-title mb-1">{obra.nombre}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {obra.cliente   && <span>Cliente: <strong className="text-gray-700">{obra.cliente}</strong></span>}
            {obra.ubicacion && <span>Ubicación: <strong className="text-gray-700">{obra.ubicacion}</strong></span>}
            {obra.fecha_inicio && <span>Inicio: <strong className="text-gray-700">{obra.fecha_inicio}</strong></span>}
            {obra.fecha_cierre && <span>Cierre est.: <strong className="text-gray-700">{obra.fecha_cierre}</strong></span>}
          </div>
        </div>
        <Badge s={obra.status} />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="metric-card border-l-4 border-blue-400">
          <div className="metric-label">Presupuesto estimado</div>
          <div className="metric-value text-blue-600">
            {presupuesto > 0 ? fmt(presupuesto) : <span className="text-gray-300 text-base">Sin catálogo</span>}
          </div>
          <div className="metric-sub">Del catálogo de insumos</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total facturado</div>
          <div className="metric-value text-gray-800">{fmt(totalFacturado)}</div>
          <div className="metric-sub">{facturas.length} factura{facturas.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Gastos directos</div>
          <div className="metric-value text-purple-600">{fmt(totalGastos)}</div>
          <div className="metric-sub">{gastos.length} registro{gastos.length !== 1 ? 's' : ''}</div>
        </div>
        <div className={`metric-card border-l-4 ${sobre ? 'border-red-400' : 'border-emerald-400'}`}>
          <div className="metric-label">Total comprometido</div>
          <div className={`metric-value ${sobre ? 'text-red-600' : 'text-gray-900'}`}>{fmt(totalGastado)}</div>
          <div className="metric-sub">{sobre ? '⚠ Sobrepresupuesto' : 'Facturas + gastos directos'}</div>
        </div>
      </div>

      {/* Barra de avance */}
      {presupuesto > 0 && (
        <div className="card mb-5">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-semibold text-gray-700">Avance presupuestal</span>
            <span className={`text-sm font-bold ${sobre ? 'text-red-600' : 'text-gray-700'}`}>
              {(presupuesto > 0 ? (totalGastado / presupuesto) * 100 : 0).toFixed(1)}%
              {sobre && <span className="ml-1 text-xs">({fmt(totalGastado - presupuesto)} sobre)</span>}
            </span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: sobre ? '#dc2626' : pct > 80 ? '#d97706' : '#185FA5'
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{fmt(totalGastado)} comprometido</span>
            <span>{fmt(presupuesto)} estimado</span>
          </div>
        </div>
      )}

      {/* Facturas */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title mb-0">Facturas de la obra</div>
          <div className="text-xs text-gray-400">{facturas.length} en total · {fmt(totalFacturado)}</div>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Folio</th><th>Proveedor</th><th>Fecha</th>
                <th className="text-right">Monto</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map(f => (
                <tr key={f.id}>
                  <td className="font-mono text-xs text-gray-500">{f.folio}</td>
                  <td className="font-medium text-gray-800">{f.proveedor}</td>
                  <td className="text-gray-500 text-sm">{f.fecha}</td>
                  <td className="text-right font-semibold">{fmt(f.monto)}</td>
                  <td><Badge s={f.status} /></td>
                </tr>
              ))}
              {facturas.length === 0 && (
                <tr><td colSpan="5" className="text-center text-gray-400 py-6">Sin facturas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gastos directos */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title mb-0">Gastos directos</div>
          <div className="text-xs text-gray-400">{gastos.length} registros · {fmt(totalGastos)}</div>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Concepto</th><th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => (
                <tr key={g.id}>
                  <td className="text-gray-500 text-sm whitespace-nowrap">{g.fecha}</td>
                  <td className="text-gray-700">{g.concepto}</td>
                  <td className="text-right font-semibold">{fmt(g.monto)}</td>
                </tr>
              ))}
              {gastos.length === 0 && (
                <tr><td colSpan="3" className="text-center text-gray-400 py-6">Sin gastos directos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pedidos agrupados por OC */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title mb-0">Órdenes de compra</div>
          <div className="text-xs text-gray-400">{Object.keys(pedidosPorFolio).length} OC{Object.keys(pedidosPorFolio).length !== 1 ? 's' : ''}</div>
        </div>
        {Object.keys(pedidosPorFolio).length === 0 ? (
          <p className="text-center text-gray-400 py-6">Sin pedidos registrados</p>
        ) : (
          <div className="space-y-2">
            {Object.keys(pedidosPorFolio).sort((a, b) => b.localeCompare(a)).map(folio => {
              const items = pedidosPorFolio[folio]
              const allRecibido = items.every(i => i.status === 'Recibido')
              const anyRecibido = items.some(i => i.status === 'Recibido' || i.status === 'Parcial')
              const st = allRecibido ? 'Recibido' : anyRecibido ? 'Parcial' : 'Pendiente'
              const stColor = st === 'Recibido' ? 'bg-green-100 text-green-700' : st === 'Parcial' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
              return (
                <div key={folio} className="border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-t-lg">
                    <span className="font-bold font-mono text-gray-700 text-sm w-28 shrink-0">{folio}</span>
                    <span className="text-sm text-gray-500 shrink-0">{items[0].fecha}</span>
                    <span className="font-semibold text-gray-800 text-sm flex-1 truncate">{items[0].proveedor}</span>
                    <span className="text-xs text-gray-400">{items.length} insumo{items.length !== 1 ? 's' : ''}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${stColor}`}>{st}</span>
                  </div>
                  <div className="border-t border-gray-200">
                    <table className="m-0 border-0 w-full text-sm">
                      <tbody>
                        {items.map(item => (
                          <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                            <td className="py-2 px-4 font-medium text-gray-800">{item.producto}</td>
                            <td className="py-2 px-4 text-center text-gray-600 w-24">{item.cantidad} <span className="text-xs text-gray-400">{item.unidad}</span></td>
                            <td className="py-2 px-4 text-right w-28">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${stColor}`}>{item.status || 'Pendiente'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
