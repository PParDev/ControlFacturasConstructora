import { useState } from 'react'
import { Badge, CatBadge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { fmt } from '../lib/utils'
import { getObras, getGastos, getFacturas, getCuentas, getRecepciones, getPedidos, getExplosionInsumos, getEstadoCuenta, getHistorialVariaciones } from '../lib/api'
import { useQuery } from '@tanstack/react-query'

export default function Reportes() {
  const [obraId, setObraId] = useState('Todas')
  const [tipo, setTipo] = useState('Resumen por obra')
  const [gen,  setGen]  = useState(true)
  const [guiaOpen, setGuiaOpen] = useState(false)

  // Filtros para Estado de Cuenta
  const [selCuenta, setSelCuenta] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const { data: obras = [], isLoading: lObr } = useQuery({ queryKey: ['obras'], queryFn: getObras })
  const { data: gastos = [], isLoading: lGas } = useQuery({ queryKey: ['gastos'], queryFn: getGastos })
  const { data: facturas = [], isLoading: lFac } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })
  const { data: cuentas = [], isLoading: lCheq } = useQuery({ queryKey: ['cuentas'], queryFn: getCuentas })
  const { data: recepciones = [], isLoading: lRec } = useQuery({ queryKey: ['recepciones'], queryFn: getRecepciones })
  const { data: pedidos = [], isLoading: lPed } = useQuery({ queryKey: ['pedidos'], queryFn: getPedidos })

  const { data: explosion = [], isLoading: lExp } = useQuery({ 
    queryKey: ['explosion', obraId], 
    queryFn: () => getExplosionInsumos(obraId),
    enabled: tipo === 'Explosión de insumos y avance' && obraId !== 'Todas'
  })

  const { data: edc, isLoading: lEdc } = useQuery({
    queryKey: ['estado_cuenta', selCuenta, desde, hasta],
    queryFn: () => getEstadoCuenta(selCuenta, desde, hasta),
    enabled: tipo === 'Estado de cuenta bancaria' && !!selCuenta && gen
  })

  const { data: variaciones = [], isLoading: lVar } = useQuery({
    queryKey: ['variaciones', obraId],
    queryFn: () => getHistorialVariaciones(obraId),
    enabled: tipo === 'Historial y Variación de Precios' && obraId !== 'Todas' && gen
  })

  const isLoading = lObr || lGas || lFac || lCheq || lRec || lPed || lExp || lEdc || lVar

  if (isLoading && obras.length === 0) {
    return (
      <div>
        <div className="page-title">Reportes</div>
        <div className="page-sub">Consulta filtrada por obra, fecha y categoría</div>
        <Loader />
      </div>
    )
  }

  // Helpers de filtrado
  const filterByObra = (items) => {
    if (obraId === 'Todas') return items
    return items.filter(i => i.obra_id == obraId)
  }

  // Data para reportes
  const filteredGastos = filterByObra(gastos)
  const pendingFacts   = filterByObra(facturas.filter(f => f.status === 'Pendiente'))
  const filteredCuentas = cuentas
  const filteredPeds   = filterByObra(pedidos)

  const totalPend = pendingFacts.reduce((s, f) => s + f.monto, 0)

  const matTotal = filteredGastos.filter(g => g.cat === 'Material').reduce((s, g) => s + g.monto, 0)
  const moTotal  = filteredGastos.filter(g => g.cat === 'Mano de obra').reduce((s, g) => s + g.monto, 0)
  const ccTotal  = filteredGastos.filter(g => g.cat === 'Caja chica').reduce((s, g) => s + g.monto, 0)
  const totalGas = matTotal + moTotal + ccTotal

  const getObraName = () => {
    if (obraId === 'Todas') return 'Todas las obras'
    return obras.find(o => o.id == obraId)?.nombre || `Obra #${obraId}`
  }

  return (
    <div>
      <div className="page-title">Reportes</div>
      <div className="page-sub">Consulta filtrada por obra, fecha y categoría</div>

      {/* Filtros */}
      <div className="card">
        <div className="card-title">Generador de Reportes</div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="field">
            <label>Obra</label>
            <select value={obraId} onChange={e => { setObraId(e.target.value); setGen(false) }}>
              <option value="Todas">Todas</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Tipo de reporte</label>
            <select value={tipo} onChange={e => { setTipo(e.target.value); setGen(false) }}>
              <option>Resumen por obra</option>
              <option>Facturas pendientes</option>
              <option>Pedidos vs Entregas (Merma)</option>
              <option>Estado de cuenta bancaria</option>
              <option>Explosión de insumos y avance</option>
              <option>Historial y Variación de Precios</option>
            </select>
          </div>
        </div>

        {tipo === 'Estado de cuenta bancaria' && (
          <div className="grid grid-cols-3 gap-2.5 mt-2.5 pt-2.5 border-t border-gray-100">
            <div className="field">
              <label>Cuenta Bancaria</label>
              <select value={selCuenta} onChange={e => { setSelCuenta(e.target.value); setGen(false) }}>
                <option value="">— Seleccionar cuenta —</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Desde</label>
              <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setGen(false) }} />
            </div>
            <div className="field">
              <label>Hasta</label>
              <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setGen(false) }} />
            </div>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button className="btn btn-primary" onClick={() => setGen(true)}>Generar reporte</button>
          {tipo === 'Explosión de insumos y avance' && obraId !== 'Todas' && (
            <a
              href={`/api/reportes/explosion-insumos/${obraId}/excel`}
              target="_blank"
              rel="noreferrer"
              className="btn flex items-center gap-1.5"
            >
              ↓ Exportar Excel
            </a>
          )}
        </div>
      </div>

      {/* ── Resumen por obra ── */}
      {gen && tipo === 'Resumen por obra' && (
        <>
          <div className="card">
            <div className="card-title">Resumen de Gastos — {getObraName()}</div>
            <div className="grid grid-cols-4 gap-2.5">
              <div className="metric-card"><div className="metric-label">Material</div><div className="metric-value">{fmt(matTotal)}</div></div>
              <div className="metric-card"><div className="metric-label">Mano de obra</div><div className="metric-value">{fmt(moTotal)}</div></div>
              <div className="metric-card"><div className="metric-label">Caja chica</div><div className="metric-value">{fmt(ccTotal)}</div></div>
              <div className="metric-card"><div className="metric-label">Total</div><div className="metric-value text-primary">{fmt(totalGas)}</div></div>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Detalle de Gastos</div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Obra</th><th>Categoría</th><th>Concepto</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {filteredGastos.map(g => (
                    <tr key={g.id}>
                      <td>{g.fecha}</td>
                      <td>{obras.find(o => o.id === g.obra_id)?.nombre || g.obra_id}</td>
                      <td><CatBadge s={g.cat} /></td>
                      <td>{g.concepto}</td>
                      <td className="font-semibold">{fmt(g.monto)}</td>
                    </tr>
                  ))}
                  {filteredGastos.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-gray-400">Sin gastos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Facturas pendientes ── */}
      {gen && tipo === 'Facturas pendientes' && (
        <div className="card">
          <div className="card-title">Facturas pendientes de pago — {getObraName()}</div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Folio</th><th>Proveedor</th><th>Obra</th><th>Fecha</th><th>Monto</th><th>Estatus</th></tr>
              </thead>
              <tbody>
                {pendingFacts.map(f => (
                  <tr key={f.id}>
                    <td className="font-medium text-gray-700">{f.folio}</td>
                    <td>{f.proveedor}</td>
                    <td>{obras.find(o => o.id === f.obra_id)?.nombre || f.obra_id}</td>
                    <td>{f.fecha}</td>
                    <td>{fmt(f.monto)}</td><td><Badge s={f.status} /></td>
                  </tr>
                ))}
                {pendingFacts.length > 0 ? (
                  <tr className="no-hover bg-gray-50">
                    <td colSpan={4} className="font-semibold !border-t-2 border-gray-300 text-right pr-4">Total pendiente por pagar:</td>
                    <td className="font-semibold !border-t-2 border-gray-300 text-red-600 text-lg">{fmt(totalPend)}</td>
                    <td className="!border-t-2 border-gray-300"></td>
                  </tr>
                ) : (
                  <tr><td colSpan="6" className="text-center text-gray-400">Sin facturas pendientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pedidos vs Entregas (Merma) ── */}
      {gen && tipo === 'Pedidos vs Entregas (Merma)' && (
        <div className="card">
          <div className="card-title">Pedidos vs Entregas — {getObraName()}</div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Pedido</th><th>Producto</th><th>Obra</th><th>Pedidas (OC)</th><th>Recibidas</th><th>Diferencia</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {filteredPeds.map(p => {
                  const recsForPed = recepciones.filter(r => r.pedido_id === p.id)
                  const totalRec = recsForPed.reduce((sum, r) => sum + r.cantidad_recibida, 0)
                  const diff = p.cantidad - totalRec
                  let badge = "Pendiente"
                  if (totalRec > 0) {
                    if (diff === 0) badge = "Correcto"
                    else if (diff > 0) badge = "Faltante"
                    else badge = "Superávit"
                  }

                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.folio}</td>
                      <td>{p.producto}</td>
                      <td>{obras.find(o => o.id === p.obra_id)?.nombre}</td>
                      <td>{p.cantidad} u</td>
                      <td>{totalRec} u</td>
                      <td className={`font-semibold ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                        {diff === 0 ? '—' : `${diff} u`}
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium 
                          ${badge === 'Correcto' ? 'bg-green-100 text-green-700' : 
                            badge === 'Faltante' ? 'bg-red-100 text-red-700' : 
                            badge === 'Superávit' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {badge}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {filteredPeds.length === 0 && (
                  <tr><td colSpan="7" className="text-center text-gray-400">No hay pedidos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Estado de cuenta bancaria ── */}
      {gen && tipo === 'Estado de cuenta bancaria' && (
        <>
          {!selCuenta ? (
            <div className="card text-center py-10 text-gray-400">
              Seleccione una cuenta bancaria y rango de fechas para generar el estado de cuenta.
            </div>
          ) : !edc ? (
             <div className="card"><Loader /></div>
          ) : (
            <EstadoCuentaDetallado edc={edc} fmt={fmt} />
          )}
        </>
      )}

      {/* ── Variación de Precios ── */}
      {gen && tipo === 'Historial y Variación de Precios' && (
        <>
          {obraId === 'Todas' ? (
            <div className="card text-center py-10 text-gray-400">
              Seleccione una obra en específico para ver el historial y variación de precios.
            </div>
          ) : lVar ? (
            <div className="card"><div className="py-8 text-center text-gray-400">Cargando métricas de impacto...</div></div>
          ) : (
            <HistorialVariacionPrecios variaciones={variaciones} obraNombre={getObraName()} fmt={fmt} />
          )}
        </>
      )}

      {/* ── Comparativa Presupuesto vs Facturado ── */}
      {gen && tipo === 'Explosión de insumos y avance' && (
        <>
          {obraId === 'Todas' ? (
            <div className="card text-center py-10 text-gray-400">
              Selecciona una obra específica para ver la comparativa de insumos.
            </div>
          ) : lExp ? (
            <div className="card"><div className="py-8 text-center text-gray-400">Cargando...</div></div>
          ) : (
            <ExplosionComparativa
              explosion={explosion}
              obraNombre={getObraName()}
              obraId={obraId}
            />
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Componente separado para la comparativa
// ─────────────────────────────────────────────────────────────
function ExplosionComparativa({ explosion, obraNombre, obraId }) {
  const [q, setQ] = useState('')
  const [catFiltro, setCatFiltro] = useState('Todas')
  const [soloDesviados, setSoloDesviados] = useState(false)

  const categorias = [...new Set(explosion.map(e => e.categoria).filter(Boolean))]

  const filas = explosion.filter(e => {
    const matchQ   = !q || e.concepto.toLowerCase().includes(q.toLowerCase()) || (e.codigo || '').toLowerCase().includes(q.toLowerCase())
    const matchCat = catFiltro === 'Todas' || e.categoria === catFiltro
    const matchDes = !soloDesviados || e.costo_real > e.presupuesto_total
    return matchQ && matchCat && matchDes
  })

  // Totales globales (sobre todo el catálogo, no solo el filtro)
  const totPresup = explosion.reduce((s, e) => s + (e.presupuesto_total || 0), 0)
  const totReal   = explosion.reduce((s, e) => s + (e.costo_real || 0), 0)
  const totDif    = totReal - totPresup
  const pctEjec   = totPresup > 0 ? (totReal / totPresup) * 100 : 0
  const sobrepres  = totReal > totPresup

  // Totales del filtro actual
  const filtPresup = filas.reduce((s, e) => s + (e.presupuesto_total || 0), 0)
  const filtReal   = filas.reduce((s, e) => s + (e.costo_real || 0), 0)
  const filtDif    = filtReal - filtPresup

  return (
    <>
      {/* ── KPIs de resumen ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="metric-card border-l-4 border-blue-400">
          <div className="metric-label">Presupuesto total</div>
          <div className="metric-value text-blue-600">{fmt(totPresup)}</div>
          <div className="metric-sub">{explosion.length} conceptos</div>
        </div>
        <div className="metric-card border-l-4 border-gray-400">
          <div className="metric-label">Total facturado</div>
          <div className="metric-value text-gray-800">{fmt(totReal)}</div>
          <div className="metric-sub">{explosion.filter(e => e.costo_real > 0).length} con compras</div>
        </div>
        <div className={`metric-card border-l-4 ${sobrepres ? 'border-red-400' : 'border-emerald-400'}`}>
          <div className="metric-label">Diferencia acumulada</div>
          <div className={`metric-value ${sobrepres ? 'text-red-600' : 'text-emerald-600'}`}>
            {sobrepres ? '+' : ''}{fmt(totDif)}
          </div>
          <div className="metric-sub">{sobrepres ? '⚠ Sobrepresupuesto' : 'Dentro del presupuesto'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">% Presupuesto ejecutado</div>
          <div className={`metric-value ${pctEjec > 100 ? 'text-red-600' : pctEjec > 80 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {pctEjec.toFixed(1)}%
          </div>
          <div className="mt-1.5">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(pctEjec, 100)}%`, background: pctEjec > 100 ? '#dc2626' : pctEjec > 80 ? '#d97706' : '#185FA5' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabla comparativa ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="card-title mb-0">
            Comparativa insumo por insumo — <span className="text-primary">{obraNombre}</span>
          </div>
          <a
            href={`/api/reportes/explosion-insumos/${obraId}/excel`}
            target="_blank"
            rel="noreferrer"
            className="btn text-xs px-3 py-[6px] flex items-center gap-1.5"
          >
            ↓ Exportar Excel
          </a>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <input
            className="flex-1 min-w-[180px] text-sm px-2.5 py-[7px] border border-gray-200 rounded-md outline-none focus:border-primary transition-colors"
            placeholder="🔍 Buscar concepto o código..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {categorias.length > 0 && (
            <select
              className="text-sm border border-gray-200 rounded-md px-2.5 py-[7px] outline-none focus:border-primary"
              value={catFiltro}
              onChange={e => setCatFiltro(e.target.value)}
            >
              <option value="Todas">Todas las categorías</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={soloDesviados} onChange={e => setSoloDesviados(e.target.checked)} className="accent-red-500" />
            Solo desviados
          </label>
          {(q || catFiltro !== 'Todas' || soloDesviados) && (
            <button className="text-xs text-gray-400 hover:text-gray-700 underline"
              onClick={() => { setQ(''); setCatFiltro('Todas'); setSoloDesviados(false) }}>
              Limpiar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-y border-gray-200">
                {/* Identificación */}
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Cód.</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Concepto</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-12">Un.</th>

                {/* Bloque ESTIMADO */}
                <th className="px-3 py-2.5 text-xs font-semibold text-blue-600 uppercase tracking-wide border-l border-blue-100 bg-blue-50/60 text-right">Cant. Pres.</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-blue-600 uppercase tracking-wide bg-blue-50/60 text-right">Precio Ref.</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-blue-600 uppercase tracking-wide bg-blue-50/60 text-right">Total Est.</th>

                {/* Bloque REAL */}
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200 text-right">Cant. Real</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">Precio Real</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">Total Real</th>

                {/* DIFERENCIA */}
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-l border-gray-200 text-right">Diferencia</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-20">% Avance</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((e, i) => {
                const diferencia  = e.costo_real - (e.presupuesto_total || 0)
                const pct         = e.presupuesto_total > 0 ? (e.costo_real / e.presupuesto_total) * 100 : 0
                const sinCompras  = e.cant_comprada === 0
                const sobre       = diferencia > 0.01
                const rowBg       = sobre ? 'bg-red-50/40 hover:bg-red-50/60' : i % 2 === 0 ? 'hover:bg-gray-50' : 'bg-gray-50/30 hover:bg-gray-50'

                return (
                  <tr key={e.id || i} className={`border-t border-gray-100 transition-colors ${rowBg}`}>
                    {/* Identificación */}
                    <td className="px-3 py-2">
                      <span className="font-mono text-[10px] text-gray-400">{e.codigo}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-800 text-sm">{e.concepto}</span>
                      {e.categoria && <span className="ml-1.5 text-[10px] text-gray-400">{e.categoria}</span>}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-400 text-xs">{e.unidad}</td>

                    {/* Bloque ESTIMADO */}
                    <td className="px-3 py-2 text-right border-l border-blue-100 bg-blue-50/30 text-gray-700">{e.cant_presupuestada}</td>
                    <td className="px-3 py-2 text-right bg-blue-50/30 text-gray-500 text-xs">{fmt(e.precio_estimado)}</td>
                    <td className="px-3 py-2 text-right bg-blue-50/30 font-semibold text-blue-700">{fmt(e.presupuesto_total)}</td>

                    {/* Bloque REAL */}
                    <td className={`px-3 py-2 text-right border-l border-gray-100 ${sinCompras ? 'text-gray-300' : 'text-gray-700'}`}>
                      {sinCompras ? '—' : e.cant_comprada}
                    </td>
                    <td className={`px-3 py-2 text-right text-xs ${sinCompras ? 'text-gray-300' : e.precio_real_prom > e.precio_estimado ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {sinCompras ? '—' : fmt(e.precio_real_prom)}
                      {!sinCompras && e.precio_real_prom > e.precio_estimado && ' ⚠'}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${sinCompras ? 'text-gray-300' : sobre ? 'text-red-600' : 'text-gray-800'}`}>
                      {sinCompras ? '—' : fmt(e.costo_real)}
                    </td>

                    {/* DIFERENCIA */}
                    <td className={`px-3 py-2 text-right border-l border-gray-100 font-bold ${sinCompras ? 'text-gray-300' : sobre ? 'text-red-600' : 'text-emerald-600'}`}>
                      {sinCompras ? '—' : (sobre ? '+' : '') + fmt(diferencia)}
                    </td>
                    <td className="px-2 py-2">
                      {sinCompras ? (
                        <span className="text-gray-300 text-xs block text-center">0%</span>
                      ) : (
                        <div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
                            <div className="h-full rounded-full"
                              style={{ width: `${Math.min(pct, 100)}%`, background: pct > 100 ? '#dc2626' : pct > 80 ? '#d97706' : '#1D9E75' }} />
                          </div>
                          <span className={`text-[10px] font-semibold block text-center ${pct > 100 ? 'text-red-600' : pct > 80 ? 'text-yellow-600' : 'text-gray-600'}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}

              {filas.length === 0 && (
                <tr><td colSpan="11" className="text-center text-gray-400 py-8">
                  {explosion.length === 0 ? 'Esta obra no tiene catálogo cargado.' : 'Sin resultados para el filtro actual.'}
                </td></tr>
              )}
            </tbody>

            {/* Fila de totales del filtro */}
            {filas.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-sm">
                  <td colSpan="3" className="px-3 py-3 text-gray-600">{filas.length} conceptos</td>
                  <td colSpan="2" className="px-3 py-3 border-l border-blue-100 bg-blue-50/30"></td>
                  <td className="px-3 py-3 text-right bg-blue-50/30 text-blue-700">{fmt(filtPresup)}</td>
                  <td colSpan="2" className="px-3 py-3 border-l border-gray-200"></td>
                  <td className="px-3 py-3 text-right text-gray-900">{fmt(filtReal)}</td>
                  <td className={`px-3 py-3 text-right border-l border-gray-200 ${filtDif > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {filtDif > 0 ? '+' : ''}{fmt(filtDif)}
                  </td>
                  <td className="px-2 py-3 text-center text-xs text-gray-500">
                    {filtPresup > 0 ? (filtReal / filtPresup * 100).toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 flex-wrap text-xs text-gray-500 mt-2 px-1">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-blue-50 border border-blue-200"></span> Columnas estimadas (catálogo)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-white border border-gray-200"></span> Columnas reales (facturado)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-200"></span> Fila en sobrepresupuesto</span>
        <span className="flex items-center gap-1.5">⚠ Precio unitario real mayor al de referencia</span>
      </div>
    </>
  )
}


// ─────────────────────────────────────────────────────────────
// Componente de Estado de Cuenta Detallado
// ─────────────────────────────────────────────────────────────
function EstadoCuentaDetallado({ edc, fmt }) {
  const { cuenta, saldo_anterior, transacciones, resumen, saldo_final } = edc;

  let runningBalance = saldo_anterior;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="metric-card">
          <div className="metric-label">Saldo Anterior</div>
          <div className="metric-value text-gray-400">{fmt(saldo_anterior)}</div>
        </div>
        <div className="metric-card border-x border-gray-100">
          <div className="metric-label">Movimientos Periodo</div>
          <div className="flex justify-between mt-1">
            <span className="text-emerald-600 text-sm font-medium">+{fmt(resumen.abonos)}</span>
            <span className="text-red-600 text-sm font-medium">-{fmt(resumen.cargos)}</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Saldo Final</div>
          <div className="metric-value text-primary">{fmt(saldo_final)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title flex justify-between items-center mb-0">
          <span>Detalle de Movimientos — {cuenta.nombre}</span>
          <span className="text-xs font-normal text-gray-500">{cuenta.banco} ({cuenta.cuenta_numero})</span>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Concepto / Beneficiario</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Obra</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Cargo</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Abono</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase bg-blue-50/30">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50/50">
                <td colSpan="5" className="px-3 py-2 text-gray-400 italic">Saldo inicial al inicio del periodo</td>
                <td className="px-3 py-2 text-right font-medium text-gray-400 bg-blue-50/30">{fmt(saldo_anterior)}</td>
              </tr>
              {transacciones.map((t) => {
                if (t.tipo === 'Abono') runningBalance += t.monto;
                else runningBalance -= t.monto;

                return (
                  <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(t.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{t.concepto}</div>
                      {t.beneficiario && <div className="text-[10px] text-gray-400 uppercase tracking-tight">{t.beneficiario}</div>}
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs">
                      {t.obra_nombre || '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-red-600 font-medium">
                      {t.tipo === 'Cargo' ? fmt(t.monto) : ''}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-600 font-medium">
                      {t.tipo === 'Abono' ? fmt(t.monto) : ''}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-gray-700 bg-blue-50/30">
                      {fmt(runningBalance)}
                    </td>
                  </tr>
                );
              })}
              {transacciones.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-3 py-8 text-center text-gray-300">
                    No hay movimientos registrados en este rango de fechas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente para Variación Historial de Precios
// ─────────────────────────────────────────────────────────────
function HistorialVariacionPrecios({ variaciones, obraNombre, fmt }) {
  const impactoTotal = variaciones.reduce((s, v) => s + v.impacto_financiero, 0);

  // Ordenar para encontrar el top de inflación
  const topInflacion = [...variaciones].sort((a, b) => b.impacto_financiero - a.impacto_financiero).slice(0, 3);

  return (
    <>
      <div className="card border-l-4 mb-4 border-l-primary bg-blue-50/20">
        <div className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Impacto Financiero de Inflación en Obra</div>
        <div className="flex items-baseline gap-3">
          <div className={`text-3xl font-black ${impactoTotal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {impactoTotal > 0 ? '+' : ''}{fmt(impactoTotal)}
          </div>
          <div className="text-sm text-gray-600">
            {impactoTotal > 0 ? 'Sobrecosto total estimado debido a variaciones de precio en compras.' : 'Ahorro total estimado debido a mejores precios de compra.'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title mb-4">
          Detalle Analítico de Inflación — <span className="text-primary">{obraNombre}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-y border-gray-200">
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">Cód.</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">Insumo</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-blue-600 uppercase text-right border-l border-gray-200 bg-blue-50/50">Precio Estimado</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase text-right">Promedio Real</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase text-right">Pico Máximo</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-red-600 uppercase text-right border-l border-gray-200 bg-red-50/50">Impacto ($)</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase bg-red-50/50">Origen del Pico</th>
              </tr>
            </thead>
            <tbody>
              {variaciones.map((v) => {
                const isOverrun = v.impacto_financiero > 0;
                const pctPico = v.precio_referencia > 0 ? ((v.precio_maximo - v.precio_referencia) / v.precio_referencia) * 100 : 0;
                
                return (
                  <tr key={v.catalogo_id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-mono text-gray-400">{v.codigo}</td>
                    <td className="px-3 py-2">
                       <span className="font-medium text-gray-800">{v.material}</span>
                       <span className="ml-1 text-[10px] text-gray-400">({v.cantidad_total_comprada} {v.unidad})</span>
                    </td>
                    <td className="px-3 py-2 text-right text-blue-700 bg-blue-50/20 border-l border-gray-100">
                      {fmt(v.precio_referencia)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">
                      {fmt(v.precio_promedio)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-bold text-gray-800">{fmt(v.precio_maximo)}</span>
                      {pctPico > 0 && (
                        <span className="ml-1.5 text-[10px] font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded">
                          +{pctPico.toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold border-l border-gray-100 bg-red-50/20 ${isOverrun ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isOverrun ? '+' : ''}{fmt(v.impacto_financiero)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 bg-red-50/20">
                      {v.proveedor_pico} 
                      {v.fecha_pico && <span className="block text-[10px] text-gray-400">{v.fecha_pico.slice(0, 10)}</span>}
                    </td>
                  </tr>
                );
              })}
              {variaciones.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-3 py-8 text-center text-gray-400">
                    No se han registrado variaciones de precios (facturado vs estimado) en esta obra.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
