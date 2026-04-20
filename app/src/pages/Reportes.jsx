import { useState } from 'react'
import { Badge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { SortableTh } from '../components/SortableTh'
import { useSortable } from '../hooks/useSortable'
import { fmt } from '../lib/utils'
import {
  getObras, getGastos, getFacturas, getCuentas, getRecepciones, getPedidos,
  getExplosionInsumos, getEstadoCuenta, getHistorialVariaciones,
  getAvancesObras, getFlujoCaja, getGastoMensual, getRankingProveedores,
  getGastosDirectos,
  getHistorialPreciosObra, getHistorialPreciosInsumo
} from '../lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ScatterChart, Scatter
} from 'recharts'
import { Sparkline } from '../components/Sparkline'
import { useQuery } from '@tanstack/react-query'

const TIPOS = [
  'Avance global de obras',
  'Flujo de caja',
  'Explosión de insumos y avance',
  'Gasto mensual por obra',
  'Ranking de proveedores',
  'Historial y Variación de Precios',
  'Histórico de precios por insumo',
  'Resumen por obra',
  'Facturas pendientes',
  'Pedidos vs Entregas (Merma)',
  'Estado de cuenta bancaria',
]

export default function Reportes() {
  const [obraId, setObraId] = useState('Todas')
  const [tipo,   setTipo]   = useState('Avance global de obras')

  // Filtros Estado de Cuenta
  const [selCuenta, setSelCuenta] = useState('')
  const [desde,     setDesde]     = useState('')
  const [hasta,     setHasta]     = useState('')

  // Filtro fecha corte para Explosión
  const [explosionHasta, setExplosionHasta] = useState('')

  // ── Queries base (siempre activas) ──────────────────────────────────────────
  const { data: obras      = [], isLoading: lObr  } = useQuery({ queryKey: ['obras'],      queryFn: getObras })
  const { data: gastos     = [], isLoading: lGas  } = useQuery({ queryKey: ['gastos'],     queryFn: getGastos })
  const { data: facturas   = [], isLoading: lFac  } = useQuery({ queryKey: ['facturas'],   queryFn: getFacturas })
  const { data: cuentas    = [], isLoading: lCheq } = useQuery({ queryKey: ['cuentas'],    queryFn: getCuentas })
  const { data: recepciones= [], isLoading: lRec  } = useQuery({ queryKey: ['recepciones'],queryFn: getRecepciones })
  const { data: pedidos    = [], isLoading: lPed  } = useQuery({ queryKey: ['pedidos'],    queryFn: getPedidos })

  // ── Queries condicionales ───────────────────────────────────────────────────
  const { data: explosion = [], isLoading: lExp } = useQuery({
    queryKey: ['explosion', obraId, explosionHasta],
    queryFn: () => getExplosionInsumos(obraId, explosionHasta || null),
    enabled: tipo === 'Explosión de insumos y avance' && obraId !== 'Todas'
  })

  const { data: edc, isLoading: lEdc } = useQuery({
    queryKey: ['estado_cuenta', selCuenta, desde, hasta],
    queryFn: () => getEstadoCuenta(selCuenta, desde, hasta),
    enabled: tipo === 'Estado de cuenta bancaria' && !!selCuenta
  })

  const { data: variaciones = [], isLoading: lVar } = useQuery({
    queryKey: ['variaciones', obraId],
    queryFn: () => getHistorialVariaciones(obraId),
    enabled: tipo === 'Historial y Variación de Precios' && obraId !== 'Todas'
  })

  const { data: histPrecios = [], isLoading: lHP } = useQuery({
    queryKey: ['hist_precios_obra', obraId],
    queryFn: () => getHistorialPreciosObra(obraId),
    enabled: tipo === 'Histórico de precios por insumo' && obraId !== 'Todas'
  })

  const { data: avancesObras = [], isLoading: lAv } = useQuery({
    queryKey: ['avances_obras'],
    queryFn: getAvancesObras,
    enabled: tipo === 'Avance global de obras'
  })

  const { data: flujoCaja, isLoading: lFC } = useQuery({
    queryKey: ['flujo_caja'],
    queryFn: getFlujoCaja,
    enabled: tipo === 'Flujo de caja'
  })

  const { data: gastoMensual = [], isLoading: lGM } = useQuery({
    queryKey: ['gasto_mensual', obraId],
    queryFn: () => getGastoMensual(obraId === 'Todas' ? null : obraId),
    enabled: tipo === 'Gasto mensual por obra'
  })

  const { data: rankingProv = [], isLoading: lRP } = useQuery({
    queryKey: ['ranking_proveedores', obraId],
    queryFn: () => getRankingProveedores(obraId === 'Todas' ? null : obraId),
    enabled: tipo === 'Ranking de proveedores'
  })

  const { data: gastosDirectos = [], isLoading: lGD } = useQuery({
    queryKey: ['gastos_directos', obraId],
    queryFn: () => getGastosDirectos(obraId),
    enabled: tipo === 'Explosión de insumos y avance' && obraId !== 'Todas'
  })

  const isLoading = lObr || lGas || lFac || lCheq || lRec || lPed ||
                    lExp || lEdc || lVar || lAv || lFC || lGM || lRP || lGD || lHP

  if (isLoading && obras.length === 0) {
    return (
      <div>
        <div className="page-title">Reportes</div>
        <div className="page-sub">Análisis y consultas por obra</div>
        <Loader />
      </div>
    )
  }

  const filterByObra = (items) => obraId === 'Todas' ? items : items.filter(i => i.obra_id == obraId)

  const filteredGastos  = filterByObra(gastos)
  const pendingFacts    = filterByObra(facturas.filter(f => f.status === 'Pendiente'))
  const filteredPeds    = filterByObra(pedidos)
  const totalPend       = pendingFacts.reduce((s, f) => s + f.monto, 0)

  const totalGas = filteredGastos.reduce((s, g) => s + g.monto, 0)

  const getObraName = () => {
    if (obraId === 'Todas') return 'Todas las obras'
    return obras.find(o => o.id == obraId)?.nombre || `Obra #${obraId}`
  }

  // Reportes que requieren obra específica
  const needsObra = ['Explosión de insumos y avance', 'Historial y Variación de Precios', 'Histórico de precios por insumo']
  // Reportes que NO usan filtro de obra
  const noObraFilter = ['Avance global de obras', 'Flujo de caja', 'Estado de cuenta bancaria']

  return (
    <div>
      <div className="page-title">Reportes</div>
      <div className="page-sub">Análisis y consultas por obra</div>

      {/* ── Panel de filtros ── */}
      <div className="card">
        <div className="card-title">Generador de Reportes</div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Selector de obra (oculto en reportes globales) */}
          {!noObraFilter.includes(tipo) && (
            <div className="field">
              <label>Obra</label>
              <select value={obraId} onChange={e => setObraId(e.target.value)}>
                {!needsObra.includes(tipo) && <option value="Todas">Todas</option>}
                {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
          )}
          <div className={noObraFilter.includes(tipo) ? 'col-span-2' : ''}>
            <div className="field">
              <label>Tipo de reporte</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Filtro de fecha corte — solo para Explosión */}
        {tipo === 'Explosión de insumos y avance' && (
          <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-end gap-4 flex-wrap">
            <div className="field" style={{ maxWidth: 220 }}>
              <label>Corte al (opcional)</label>
              <input
                type="date"
                value={explosionHasta}
                onChange={e => setExplosionHasta(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-gray-400 pb-1">
              Sin fecha: muestra todo lo facturado hasta hoy. Con fecha: filtra al corte indicado.
            </p>
            {obraId !== 'Todas' && (
              <a
                href={`/api/reportes/explosion-insumos/${obraId}/excel`}
                target="_blank"
                rel="noreferrer"
                className="btn flex items-center gap-1.5 mb-1"
              >
                ↓ Exportar Excel
              </a>
            )}
          </div>
        )}

        {/* Filtros de Estado de Cuenta */}
        {tipo === 'Estado de cuenta bancaria' && (
          <div className="grid grid-cols-3 gap-2.5 mt-2.5 pt-2.5 border-t border-gray-100">
            <div className="field">
              <label>Cuenta Bancaria</label>
              <select value={selCuenta} onChange={e => setSelCuenta(e.target.value)}>
                <option value="">— Seleccionar cuenta —</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div className="field">
              <label>Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* AVANCE GLOBAL DE OBRAS                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Avance global de obras' && (
        lAv ? <div className="card"><Loader /></div>
             : <AvanceGlobalObras obras={avancesObras} fmt={fmt} />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* FLUJO DE CAJA                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Flujo de caja' && (
        lFC ? <div className="card"><Loader /></div>
            : flujoCaja ? <FlujoCaja data={flujoCaja} fmt={fmt} />
            : <div className="card text-center py-10 text-gray-400">No se pudo cargar el flujo de caja.</div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* EXPLOSIÓN DE INSUMOS Y AVANCE                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Explosión de insumos y avance' && (
        obraId === 'Todas' ? (
          <div className="card text-center py-10 text-gray-400">
            Selecciona una obra específica para ver la comparativa de insumos.
          </div>
        ) : lExp ? (
          <div className="card"><Loader /></div>
        ) : (
          <ExplosionComparativa
            explosion={explosion}
            gastosDirectos={gastosDirectos}
            obraNombre={getObraName()}
            obraId={obraId}
            corteHasta={explosionHasta}
          />
        )
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* GASTO MENSUAL POR OBRA                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Gasto mensual por obra' && (
        lGM ? <div className="card"><Loader /></div>
            : <GastoMensual datos={gastoMensual} obraNombre={getObraName()} fmt={fmt} />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RANKING DE PROVEEDORES                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Ranking de proveedores' && (
        lRP ? <div className="card"><Loader /></div>
            : <RankingProveedores datos={rankingProv} obraNombre={getObraName()} fmt={fmt} />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HISTORIAL Y VARIACIÓN DE PRECIOS                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Historial y Variación de Precios' && (
        obraId === 'Todas' ? (
          <div className="card text-center py-10 text-gray-400">
            Seleccione una obra en específico para ver el historial y variación de precios.
          </div>
        ) : lVar ? (
          <div className="card"><Loader /></div>
        ) : (
          <HistorialVariacionPrecios variaciones={variaciones} obraNombre={getObraName()} fmt={fmt} />
        )
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HISTÓRICO DE PRECIOS POR INSUMO                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Histórico de precios por insumo' && (
        obraId === 'Todas' ? (
          <div className="card text-center py-10 text-gray-400">
            Seleccione una obra para analizar el histórico de precios de sus insumos.
          </div>
        ) : lHP ? (
          <div className="card"><Loader /></div>
        ) : (
          <HistoricoPrecios insumos={histPrecios} obraId={obraId} obraNombre={getObraName()} fmt={fmt} />
        )
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RESUMEN POR OBRA                                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Resumen por obra' && (
        <>
          <div className="card">
            <div className="card-title">Resumen de Gastos — {getObraName()}</div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="metric-card"><div className="metric-label">Total gastos directos</div><div className="metric-value text-primary">{fmt(totalGas)}</div></div>
              <div className="metric-card"><div className="metric-label">Registros</div><div className="metric-value">{filteredGastos.length}</div></div>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Detalle de Gastos</div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Obra</th><th>Concepto</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {filteredGastos.map(g => (
                    <tr key={g.id}>
                      <td>{g.fecha}</td>
                      <td>{obras.find(o => o.id === g.obra_id)?.nombre || g.obra_id}</td>
                      <td>{g.concepto}</td>
                      <td className="font-semibold">{fmt(g.monto)}</td>
                    </tr>
                  ))}
                  {filteredGastos.length === 0 && (
                    <tr><td colSpan="4" className="text-center text-gray-400">Sin gastos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* FACTURAS PENDIENTES                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Facturas pendientes' && (
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
                    <td>{fmt(f.monto)}</td>
                    <td><Badge s={f.status} /></td>
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PEDIDOS VS ENTREGAS                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Pedidos vs Entregas (Merma)' && (
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
                  const totalRec   = recsForPed.reduce((sum, r) => sum + r.cantidad_recibida, 0)
                  const diff       = p.cantidad - totalRec
                  let badge = 'Pendiente'
                  if (totalRec > 0) {
                    if (diff === 0)  badge = 'Correcto'
                    else if (diff > 0) badge = 'Faltante'
                    else badge = 'Superávit'
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
                          ${badge === 'Correcto'  ? 'bg-green-100 text-green-700' :
                            badge === 'Faltante'  ? 'bg-red-100 text-red-700' :
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ESTADO DE CUENTA BANCARIA                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tipo ==='Estado de cuenta bancaria' && (
        !selCuenta ? (
          <div className="card text-center py-10 text-gray-400">
            Seleccione una cuenta bancaria y rango de fechas para generar el estado de cuenta.
          </div>
        ) : !edc ? (
          <div className="card"><Loader /></div>
        ) : (
          <EstadoCuentaDetallado edc={edc} fmt={fmt} />
        )
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// AVANCE GLOBAL DE OBRAS
// ═══════════════════════════════════════════════════════════════════════════════
function AvanceGlobalObras({ obras, fmt }) {
  const total_presupuesto  = obras.reduce((s, o) => s + o.presupuesto_total, 0)
  const total_facturado    = obras.reduce((s, o) => s + o.total_facturado,   0)
  const total_gd           = obras.reduce((s, o) => s + (o.gastos_directos || 0), 0)
  const total_comprometido = total_facturado + total_gd
  const total_pendiente    = obras.reduce((s, o) => s + o.pendiente_pagar,   0)
  const diferencia         = total_comprometido - total_presupuesto

  const estadoColor = { Activa: 'bg-green-100 text-green-700', 'En pausa': 'bg-yellow-100 text-yellow-700', Terminada: 'bg-gray-100 text-gray-500' }

  return (
    <>
      {/* KPIs globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="metric-card border-l-4 border-blue-400">
          <div className="metric-label">Presupuesto total (todas las obras)</div>
          <div className="metric-value text-blue-600">{fmt(total_presupuesto)}</div>
          <div className="metric-sub">{obras.length} obras</div>
        </div>
        <div className="metric-card border-l-4 border-gray-400">
          <div className="metric-label">Total comprometido</div>
          <div className="metric-value text-gray-800">{fmt(total_comprometido)}</div>
          <div className="metric-sub">Facturas + gastos directos</div>
        </div>
        <div className={`metric-card border-l-4 ${diferencia > 0 ? 'border-red-400' : 'border-emerald-400'}`}>
          <div className="metric-label">Diferencia acumulada</div>
          <div className={`metric-value ${diferencia > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
          </div>
          <div className="metric-sub">{diferencia > 0 ? '⚠ Sobrepresupuesto' : 'Dentro del presupuesto'}</div>
        </div>
        <div className="metric-card border-l-4 border-orange-300">
          <div className="metric-label">Por pagar (facturas pendientes)</div>
          <div className="metric-value text-orange-600">{fmt(total_pendiente)}</div>
          <div className="metric-sub">Compromisos sin liquidar</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Comparativa Estimado vs Comprometido — Todas las obras</div>
        <div className="text-xs text-gray-400 -mt-2 mb-3">
          Comprometido = facturas capturadas + gastos directos (caja chica, mano de obra)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-y border-gray-200">
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">Obra</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase text-center">Estado</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-blue-600 uppercase text-right border-l border-blue-100 bg-blue-50/50">Presupuesto est.</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase text-right border-l border-gray-200">Facturado</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-purple-600 uppercase text-right">Gastos directos</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-orange-500 uppercase text-right border-l border-gray-200">Por pagar</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right border-l border-gray-200">Diferencia</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase text-center w-36">% Avance</th>
              </tr>
            </thead>
            <tbody>
              {obras.map((o) => {
                const comprometido = (o.total_facturado || 0) + (o.gastos_directos || 0)
                const dif   = comprometido - o.presupuesto_total
                const pct   = o.presupuesto_total > 0 ? (comprometido / o.presupuesto_total) * 100 : 0
                const sobre = dif > 0.01
                return (
                  <tr key={o.obra_id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${sobre ? 'bg-red-50/30' : ''}`}>
                    <td className="px-3 py-3 font-semibold text-gray-800">{o.nombre}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${estadoColor[o.estado] || 'bg-gray-100 text-gray-500'}`}>
                        {o.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-blue-700 border-l border-blue-100 bg-blue-50/20">
                      {o.presupuesto_total > 0 ? fmt(o.presupuesto_total) : <span className="text-gray-300 text-xs">Sin catálogo</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-800 border-l border-gray-100">
                      {o.total_facturado > 0 ? fmt(o.total_facturado) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {o.gastos_directos > 0
                        ? <span className="text-purple-600 font-medium">{fmt(o.gastos_directos)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right border-l border-gray-100">
                      {o.pendiente_pagar > 0
                        ? <span className="text-orange-600 font-medium">{fmt(o.pendiente_pagar)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`px-3 py-3 text-right font-bold border-l border-gray-100 ${sobre ? 'text-red-600' : comprometido > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                      {o.presupuesto_total === 0 ? '—' : (sobre ? '+' : '') + fmt(dif)}
                    </td>
                    <td className="px-3 py-3">
                      {o.presupuesto_total === 0 ? (
                        <span className="text-gray-300 text-xs block text-center">Sin est.</span>
                      ) : (
                        <div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-0.5">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%`, background: pct > 100 ? '#dc2626' : pct > 80 ? '#d97706' : '#185FA5' }} />
                          </div>
                          <span className={`text-[10px] font-semibold block text-center ${pct > 100 ? 'text-red-600' : pct > 80 ? 'text-yellow-600' : 'text-gray-600'}`}>
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {obras.length === 0 && (
                <tr><td colSpan="8" className="text-center text-gray-400 py-8">No hay obras registradas.</td></tr>
              )}
            </tbody>
            {obras.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-sm">
                  <td colSpan="2" className="px-3 py-3 text-gray-600">{obras.length} obras</td>
                  <td className="px-3 py-3 text-right text-blue-700 border-l border-blue-100 bg-blue-50/20">{fmt(total_presupuesto)}</td>
                  <td className="px-3 py-3 text-right text-gray-800 border-l border-gray-100">{fmt(total_facturado)}</td>
                  <td className="px-3 py-3 text-right text-purple-600">{total_gd > 0 ? fmt(total_gd) : '—'}</td>
                  <td className="px-3 py-3 text-right text-orange-600 border-l border-gray-100">{fmt(total_pendiente)}</td>
                  <td className={`px-3 py-3 text-right border-l border-gray-100 ${diferencia > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-gray-500">
                    {total_presupuesto > 0 ? (total_comprometido / total_presupuesto * 100).toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// FLUJO DE CAJA
// ═══════════════════════════════════════════════════════════════════════════════
function FlujoCaja({ data, fmt }) {
  const { facturas_por_obra, total_pendiente, cuentas, saldo_fiscal, saldo_caja, deuda_credito, liquidez_neta } = data
  const liquidezOk = liquidez_neta >= 0

  return (
    <>
      {/* Panel ejecutivo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="metric-card border-l-4 border-emerald-400">
          <div className="metric-label">Saldo bancario (fiscal)</div>
          <div className="metric-value text-emerald-600">{fmt(saldo_fiscal)}</div>
          <div className="metric-sub">Cuentas fiscales</div>
        </div>
        <div className="metric-card border-l-4 border-blue-300">
          <div className="metric-label">Caja chica disponible</div>
          <div className="metric-value text-blue-600">{fmt(saldo_caja)}</div>
          <div className="metric-sub">Efectivo en obra</div>
        </div>
        <div className="metric-card border-l-4 border-red-400">
          <div className="metric-label">Por pagar (facturas)</div>
          <div className="metric-value text-red-600">{fmt(total_pendiente)}</div>
          <div className="metric-sub">{facturas_por_obra.reduce((s, f) => s + f.cantidad, 0)} facturas pendientes</div>
        </div>
        <div className={`metric-card border-l-4 ${liquidezOk ? 'border-emerald-500' : 'border-red-500'}`}>
          <div className="metric-label">Posición neta de caja</div>
          <div className={`metric-value ${liquidezOk ? 'text-emerald-600' : 'text-red-600'}`}>
            {fmt(liquidez_neta)}
          </div>
          <div className="metric-sub">{liquidezOk ? 'Fondos suficientes' : '⚠ Fondos insuficientes'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Facturas pendientes por obra */}
        <div className="card">
          <div className="card-title">Facturas pendientes por obra</div>
          {facturas_por_obra.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No hay facturas pendientes.</p>
          ) : (
            <div className="space-y-3 mt-2">
              {facturas_por_obra.map(f => {
                const pct = total_pendiente > 0 ? (f.total / total_pendiente) * 100 : 0
                return (
                  <div key={f.obra_id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-medium text-gray-700">{f.obra_nombre}</span>
                      <span className="text-sm font-bold text-red-600">{fmt(f.total)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>{f.cantidad} {f.cantidad === 1 ? 'factura' : 'facturas'}</span>
                      <span>{pct.toFixed(1)}% del total</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Estado de cuentas */}
        <div className="card">
          <div className="card-title">Estado de cuentas bancarias</div>
          <div className="space-y-2 mt-2">
            {cuentas.map(c => {
              const esCred = c.tipo === 'Crédito'
              const saldo  = c.saldo_actual
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{c.nombre}</div>
                    <div className="text-[10px] text-gray-400">{c.banco} · {c.tipo}</div>
                  </div>
                  <span className={`text-sm font-bold ${esCred ? 'text-red-500' : saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {esCred ? '-' : ''}{fmt(Math.abs(saldo))}
                  </span>
                </div>
              )
            })}
          </div>
          {deuda_credito > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
              <span>Deuda en tarjetas de crédito</span>
              <span className="font-semibold text-red-500">{fmt(deuda_credito)}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// GASTO MENSUAL POR OBRA
// ═══════════════════════════════════════════════════════════════════════════════
function GastoMensual({ datos, obraNombre, fmt }) {
  // Obtener lista única de meses y obras
  const meses = [...new Set(datos.map(d => d.mes))].sort()
  const obrasUnicas = [...new Set(datos.map(d => d.obra_nombre))].sort()
  const multiObra = obrasUnicas.length > 1

  // Construir mapa [mes][obra] = total
  const mapa = {}
  datos.forEach(d => {
    if (!mapa[d.mes]) mapa[d.mes] = {}
    mapa[d.mes][d.obra_nombre] = d.total_facturado
  })

  const maxMes = Math.max(...meses.map(m => {
    return Object.values(mapa[m] || {}).reduce((s, v) => s + v, 0)
  }), 1)

  const fmtMes = (m) => {
    const [y, mo] = m.split('-')
    const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${nombres[parseInt(mo) - 1]} ${y}`
  }

  const colores = ['#185FA5','#1D9E75','#d97706','#9333ea','#e11d48','#0891b2']

  if (datos.length === 0) {
    return (
      <div className="card text-center py-10 text-gray-400">
        No hay facturas con detalles de insumos para mostrar el gasto mensual.
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title">
        Gasto mensual facturado — <span className="text-primary">{obraNombre}</span>
      </div>

      {/* Barras por mes */}
      <div className="space-y-3 mt-4">
        {meses.map(mes => {
          const totalMes = Object.values(mapa[mes] || {}).reduce((s, v) => s + v, 0)
          const pct = (totalMes / maxMes) * 100
          return (
            <div key={mes}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium text-gray-600 w-20">{fmtMes(mes)}</span>
                <div className="flex-1 mx-3">
                  {multiObra ? (
                    // Barra apilada por obra
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex">
                      {obrasUnicas.map((obra, i) => {
                        const val = mapa[mes]?.[obra] || 0
                        const w   = totalMes > 0 ? (val / totalMes) * pct : 0
                        return w > 0 ? (
                          <div
                            key={obra}
                            className="h-full transition-all"
                            style={{ width: `${w}%`, background: colores[i % colores.length] }}
                            title={`${obra}: ${fmt(val)}`}
                          />
                        ) : null
                      })}
                    </div>
                  ) : (
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold text-gray-800 w-28 text-right">{fmt(totalMes)}</span>
              </div>
              {/* Desglose por obra en vista multiobra */}
              {multiObra && (
                <div className="flex gap-3 ml-20 flex-wrap mt-1 mb-2">
                  {obrasUnicas.filter(o => mapa[mes]?.[o] > 0).map((obra, i) => (
                    <span key={obra} className="text-[10px] text-gray-500 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: colores[i % colores.length] }} />
                      {obra}: {fmt(mapa[mes][obra])}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tabla resumen */}
      <div className="overflow-x-auto mt-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-200">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Mes</th>
              {multiObra && obrasUnicas.map(o => (
                <th key={o} className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{o}</th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((mes, i) => {
              const totalMes = Object.values(mapa[mes] || {}).reduce((s, v) => s + v, 0)
              return (
                <tr key={mes} className={`border-t border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                  <td className="px-3 py-2 font-medium text-gray-700">{fmtMes(mes)}</td>
                  {multiObra && obrasUnicas.map(o => (
                    <td key={o} className="px-3 py-2 text-right text-gray-600">
                      {mapa[mes]?.[o] ? fmt(mapa[mes][o]) : <span className="text-gray-200">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-gray-800">{fmt(totalMes)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
              <td className="px-3 py-2 text-gray-600">Total</td>
              {multiObra && obrasUnicas.map(o => (
                <td key={o} className="px-3 py-2 text-right text-gray-700">
                  {fmt(datos.filter(d => d.obra_nombre === o).reduce((s, d) => s + d.total_facturado, 0))}
                </td>
              ))}
              <td className="px-3 py-2 text-right text-primary">
                {fmt(datos.reduce((s, d) => s + d.total_facturado, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// RANKING DE PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════════════
function RankingProveedores({ datos, obraNombre, fmt }) {
  const total = datos.reduce((s, d) => s + d.total_facturado, 0)

  if (datos.length === 0) {
    return (
      <div className="card text-center py-10 text-gray-400">
        No hay facturas registradas para mostrar el ranking de proveedores.
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="metric-card">
          <div className="metric-label">Total proveedores</div>
          <div className="metric-value">{datos.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total facturado</div>
          <div className="metric-value text-primary">{fmt(total)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Mayor proveedor</div>
          <div className="text-base font-bold text-gray-800 mt-1 truncate">{datos[0]?.proveedor || '—'}</div>
          <div className="metric-sub">{datos[0] ? fmt(datos[0].total_facturado) : ''}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Ranking de Proveedores — <span className="text-primary">{obraNombre}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-y border-gray-200">
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">Proveedor</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase text-center">Facturas</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase text-center">Obras</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-emerald-600 uppercase text-right border-l border-gray-200">Pagado</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-orange-500 uppercase text-right">Pendiente</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase text-right border-l border-gray-200">Total</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase text-center w-28">% del total</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((d, i) => {
                const pct = total > 0 ? (d.total_facturado / total) * 100 : 0
                return (
                  <tr key={d.proveedor} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-gray-800">{d.proveedor || <em className="text-gray-300">Sin nombre</em>}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{d.num_facturas}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{d.num_obras}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600 font-medium border-l border-gray-100">
                      {d.total_pagado > 0 ? fmt(d.total_pagado) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {d.total_pendiente > 0
                        ? <span className="text-orange-600 font-medium">{fmt(d.total_pendiente)}</span>
                        : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-800 border-l border-gray-100">
                      {fmt(d.total_facturado)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500 block text-center">{pct.toFixed(1)}%</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                <td colSpan="4" className="px-3 py-2.5 text-gray-600">{datos.length} proveedores</td>
                <td className="px-3 py-2.5 text-right text-emerald-600 border-l border-gray-100">
                  {fmt(datos.reduce((s, d) => s + d.total_pagado, 0))}
                </td>
                <td className="px-3 py-2.5 text-right text-orange-600">
                  {fmt(datos.reduce((s, d) => s + d.total_pendiente, 0))}
                </td>
                <td className="px-3 py-2.5 text-right text-primary border-l border-gray-100">{fmt(total)}</td>
                <td className="px-3 py-2.5 text-center text-xs text-gray-500">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// EXPLOSIÓN DE INSUMOS Y AVANCE
// ═══════════════════════════════════════════════════════════════════════════════
function ExplosionComparativa({ explosion, gastosDirectos = [], obraNombre, obraId, corteHasta }) {
  const [q, setQ]                       = useState('')
  const [catFiltro, setCatFiltro]       = useState('Todas')
  const [soloDesviados, setSoloDesviados] = useState(false)

  const categorias = [...new Set(explosion.map(e => e.categoria).filter(Boolean))]

  const filasBase = explosion
    .map(e => ({ ...e, diferencia: e.costo_real - (e.presupuesto_total || 0) }))
    .filter(e => {
      const matchQ   = !q || e.concepto.toLowerCase().includes(q.toLowerCase()) || (e.codigo || '').toLowerCase().includes(q.toLowerCase())
      const matchCat = catFiltro === 'Todas' || e.categoria === catFiltro
      const matchDes = !soloDesviados || e.costo_real > e.presupuesto_total
      return matchQ && matchCat && matchDes
    })

  const { sorted: filas, sortKey: expSortKey, sortDir: expSortDir, handleSort: expHandleSort } = useSortable(filasBase, 'codigo')

  const totPresup = explosion.reduce((s, e) => s + (e.presupuesto_total || 0), 0)
  const totReal   = explosion.reduce((s, e) => s + (e.costo_real || 0), 0)
  const totDif    = totReal - totPresup
  const pctEjec   = totPresup > 0 ? (totReal / totPresup) * 100 : 0
  const sobrepres = totReal > totPresup

  const filtPresup = filas.reduce((s, e) => s + (e.presupuesto_total || 0), 0)
  const filtReal   = filas.reduce((s, e) => s + (e.costo_real || 0), 0)
  const filtDif    = filtReal - filtPresup

  return (
    <>
      {corteHasta && (
        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <span className="font-semibold">Corte al:</span> {corteHasta} — Solo se contabilizan facturas emitidas hasta esta fecha.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="metric-card border-l-4 border-blue-400">
          <div className="metric-label">Presupuesto total</div>
          <div className="metric-value text-blue-600">{fmt(totPresup)}</div>
          <div className="metric-sub">{explosion.length} conceptos</div>
        </div>
        <div className="metric-card border-l-4 border-gray-400">
          <div className="metric-label">Total facturado{corteHasta ? ' al corte' : ''}</div>
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
          <div className="metric-label">% Ejecutado</div>
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

      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="card-title mb-0">
            Comparativa insumo por insumo — <span className="text-primary">{obraNombre}</span>
          </div>
          <a href={`/api/reportes/explosion-insumos/${obraId}/excel`} target="_blank" rel="noreferrer"
            className="btn text-xs px-3 py-[6px] flex items-center gap-1.5">
            ↓ Exportar Excel
          </a>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <input
            className="flex-1 min-w-[180px] text-sm px-2.5 py-[7px] border border-gray-200 rounded-md outline-none focus:border-primary transition-colors"
            placeholder="Buscar concepto o código..."
            value={q} onChange={e => setQ(e.target.value)}
          />
          {categorias.length > 0 && (
            <select className="text-sm border border-gray-200 rounded-md px-2.5 py-[7px] outline-none focus:border-primary"
              value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
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
              <tr className="text-left bg-gray-50 border-y border-gray-200 text-xs font-semibold uppercase tracking-wide">
                <SortableTh label="Cód."       col="codigo"           sortKey={expSortKey} sortDir={expSortDir} onSort={expHandleSort} className="px-3 py-2.5 text-gray-500 w-16" />
                <SortableTh label="Concepto"   col="concepto"         sortKey={expSortKey} sortDir={expSortDir} onSort={expHandleSort} className="px-3 py-2.5 text-gray-500" />
                <th className="px-2 py-2.5 text-gray-500 text-center w-12">Un.</th>
                <SortableTh label="Cant. Pres." col="cant_presupuestada" sortKey={expSortKey} sortDir={expSortDir} onSort={expHandleSort} className="px-3 py-2.5 text-blue-600 border-l border-blue-100 bg-blue-50/60" right />
                <SortableTh label="Precio Ref." col="precio_estimado"  sortKey={expSortKey} sortDir={expSortDir} onSort={expHandleSort} className="px-3 py-2.5 text-blue-600 bg-blue-50/60" right />
                <SortableTh label="Total Est."  col="presupuesto_total" sortKey={expSortKey} sortDir={expSortDir} onSort={expHandleSort} className="px-3 py-2.5 text-blue-600 bg-blue-50/60" right />
                <SortableTh label="Cant. Real"  col="cant_comprada"    sortKey={expSortKey} sortDir={expSortDir} onSort={expHandleSort} className="px-3 py-2.5 text-gray-600 border-l border-gray-200" right />
                <SortableTh label="Precio Real" col="precio_real_prom" sortKey={expSortKey} sortDir={expSortDir} onSort={expHandleSort} className="px-3 py-2.5 text-gray-600" right />
                <SortableTh label="Total Real"  col="costo_real"       sortKey={expSortKey} sortDir={expSortDir} onSort={expHandleSort} className="px-3 py-2.5 text-gray-600" right />
                <SortableTh label="Diferencia"  col="diferencia"       sortKey={expSortKey} sortDir={expSortDir} onSort={expHandleSort} className="px-3 py-2.5 text-gray-500 border-l border-gray-200" right />
                <th className="px-2 py-2.5 text-gray-500 text-center w-20">% Avance</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((e, i) => {
                const diferencia = e.diferencia
                const pct        = e.presupuesto_total > 0 ? (e.costo_real / e.presupuesto_total) * 100 : 0
                const sinCompras = e.cant_comprada === 0
                const sobre      = diferencia > 0.01
                const rowBg      = sobre ? 'bg-red-50/40 hover:bg-red-50/60' : i % 2 === 0 ? 'hover:bg-gray-50' : 'bg-gray-50/30 hover:bg-gray-50'
                return (
                  <tr key={e.id || i} className={`border-t border-gray-100 transition-colors ${rowBg}`}>
                    <td className="px-3 py-2"><span className="font-mono text-[10px] text-gray-400">{e.codigo}</span></td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-800 text-sm">{e.concepto}</span>
                      {e.categoria && <span className="ml-1.5 text-[10px] text-gray-400">{e.categoria}</span>}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-400 text-xs">{e.unidad}</td>
                    <td className="px-3 py-2 text-right border-l border-blue-100 bg-blue-50/30 text-gray-700">{e.cant_presupuestada}</td>
                    <td className="px-3 py-2 text-right bg-blue-50/30 text-gray-500 text-xs">{fmt(e.precio_estimado)}</td>
                    <td className="px-3 py-2 text-right bg-blue-50/30 font-semibold text-blue-700">{fmt(e.presupuesto_total)}</td>
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

      <div className="flex gap-4 flex-wrap text-xs text-gray-500 mt-2 px-1">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-blue-50 border border-blue-200"></span> Columnas estimadas (catálogo)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-white border border-gray-200"></span> Columnas reales (facturado)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-200"></span> Fila en sobrepresupuesto</span>
        <span className="flex items-center gap-1.5">⚠ Precio unitario real mayor al de referencia</span>
      </div>

      {/* ── Gastos directos (caja chica, mano de obra) ── */}
      {gastosDirectos.length > 0 && (() => {
        const totalGD = gastosDirectos.reduce((s, g) => s + g.total, 0)
        const totalCatalogo = explosion.reduce((s, e) => s + (e.costo_real || 0), 0)
        const totalReal = totalCatalogo + totalGD
        return (
          <div className="card mt-4 border-l-4 border-purple-300">
            <div className="card-title text-purple-700">
              Gastos directos (no vinculados al catálogo)
            </div>
            <p className="text-xs text-gray-400 -mt-2 mb-3">
              Registros de caja chica, mano de obra y otros gastos fuera del flujo OC→Factura.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-purple-50/40 border-y border-purple-100">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Registros</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-purple-600 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosDirectos.map((g, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-purple-50/20">
                      <td className="px-3 py-2 text-gray-500 text-xs">{g.categoria || '—'}</td>
                      <td className="px-3 py-2 font-medium text-gray-700">{g.concepto}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{g.cantidad}</td>
                      <td className="px-3 py-2 text-right font-semibold text-purple-700">{fmt(g.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-purple-200 bg-purple-50/30 font-bold">
                    <td colSpan="3" className="px-3 py-2 text-gray-600">
                      Total gastos directos
                    </td>
                    <td className="px-3 py-2 text-right text-purple-700">{fmt(totalGD)}</td>
                  </tr>
                  <tr className="border-t border-gray-200 bg-gray-50 font-bold text-sm">
                    <td colSpan="3" className="px-3 py-2 text-gray-700">
                      TOTAL REAL (catálogo + directos)
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900 text-base">{fmt(totalReal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      })()}
    </>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DE CUENTA BANCARIA
// ═══════════════════════════════════════════════════════════════════════════════
function EstadoCuentaDetallado({ edc, fmt }) {
  const { cuenta, saldo_anterior, transacciones, resumen, saldo_final } = edc
  let runningBalance = saldo_anterior

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
                if (t.tipo === 'Abono') runningBalance += t.monto
                else runningBalance -= t.monto
                return (
                  <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(t.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{t.concepto}</div>
                      {t.beneficiario && <div className="text-[10px] text-gray-400 uppercase tracking-tight">{t.beneficiario}</div>}
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{t.obra_nombre || '—'}</td>
                    <td className="px-3 py-2 text-right text-red-600 font-medium">{t.tipo === 'Cargo'  ? fmt(t.monto) : ''}</td>
                    <td className="px-3 py-2 text-right text-emerald-600 font-medium">{t.tipo === 'Abono' ? fmt(t.monto) : ''}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-700 bg-blue-50/30">{fmt(runningBalance)}</td>
                  </tr>
                )
              })}
              {transacciones.length === 0 && (
                <tr><td colSpan="6" className="px-3 py-8 text-center text-gray-300">
                  No hay movimientos registrados en este rango de fechas.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// HISTORIAL Y VARIACIÓN DE PRECIOS
// ═══════════════════════════════════════════════════════════════════════════════
function HistorialVariacionPrecios({ variaciones, obraNombre, fmt }) {
  const impactoTotal = variaciones.reduce((s, v) => s + v.impacto_financiero, 0)
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
                <th className="px-3 py-2.5 text-xs font-semibold text-blue-600 uppercase text-right border-l border-gray-200 bg-blue-50/50">Precio Est.</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase text-right">Promedio Real</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase text-right">Pico Máximo</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-red-600 uppercase text-right border-l border-gray-200 bg-red-50/50">Impacto ($)</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase bg-red-50/50">Origen del Pico</th>
              </tr>
            </thead>
            <tbody>
              {variaciones.map((v) => {
                const isOverrun = v.impacto_financiero > 0
                const pctPico   = v.precio_referencia > 0 ? ((v.precio_maximo - v.precio_referencia) / v.precio_referencia) * 100 : 0
                return (
                  <tr key={v.catalogo_id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-mono text-gray-400">{v.codigo}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-800">{v.material}</span>
                      <span className="ml-1 text-[10px] text-gray-400">({v.cantidad_total_comprada} {v.unidad})</span>
                    </td>
                    <td className="px-3 py-2 text-right text-blue-700 bg-blue-50/20 border-l border-gray-100">{fmt(v.precio_referencia)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">{fmt(v.precio_promedio)}</td>
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
                )
              })}
              {variaciones.length === 0 && (
                <tr><td colSpan="7" className="px-3 py-8 text-center text-gray-400">
                  No se han registrado variaciones de precios (facturado vs estimado) en esta obra.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// HISTÓRICO DE PRECIOS POR INSUMO
// Permite identificar si una obra costó más/menos por CAMBIO DE PRECIO o por
// CAMBIO DE CANTIDAD (atribución de la discrepancia).
// ════════════════════════════════════════════════════════════════════════════
const PROVEEDOR_COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']

function HistoricoPrecios({ insumos, obraId, obraNombre, fmt }) {
  const conCompras = insumos.filter(i => i.num_compras > 0)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState(conCompras[0]?.catalogo_id ?? null)

  const filtrados = conCompras.filter(i =>
    !busqueda ||
    i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (i.codigo || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const { data: detalle, isLoading: lDet } = useQuery({
    queryKey: ['hist_precio_insumo', obraId, seleccionado],
    queryFn: () => getHistorialPreciosInsumo(obraId, seleccionado),
    enabled: !!seleccionado
  })

  if (conCompras.length === 0) {
    return (
      <div className="card text-center py-10 text-gray-400">
        Aún no hay facturas registradas para los insumos de <span className="text-primary font-medium">{obraNombre}</span>.
      </div>
    )
  }

  const totalImpactoPrecio    = conCompras.reduce((s, i) => s + (i.impacto_precio    || 0), 0)
  const totalImpactoCantidad  = conCompras.reduce((s, i) => s + (i.impacto_cantidad  || 0), 0)
  const driverPrincipal       = Math.abs(totalImpactoPrecio) >= Math.abs(totalImpactoCantidad) ? 'precio' : 'cantidad'

  return (
    <>
      {/* ── Banner: ¿Qué movió el costo de la obra? ── */}
      <div className="card mb-4">
        <div className="card-title mb-3">¿Por qué esta obra costó {totalImpactoPrecio + totalImpactoCantidad >= 0 ? 'más' : 'menos'} de lo presupuestado?</div>
        <div className="grid grid-cols-3 gap-3">
          <div className={`metric-card border-l-4 ${driverPrincipal === 'precio' ? 'border-l-red-500 bg-red-50/30' : 'border-l-gray-200'}`}>
            <div className="metric-label">Impacto por PRECIO</div>
            <div className={`metric-value ${totalImpactoPrecio >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalImpactoPrecio >= 0 ? '+' : ''}{fmt(totalImpactoPrecio)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Pagamos un precio {totalImpactoPrecio >= 0 ? 'mayor' : 'menor'} al de referencia.
            </div>
          </div>
          <div className={`metric-card border-l-4 ${driverPrincipal === 'cantidad' ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-gray-200'}`}>
            <div className="metric-label">Impacto por CANTIDAD</div>
            <div className={`metric-value ${totalImpactoCantidad >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalImpactoCantidad >= 0 ? '+' : ''}{fmt(totalImpactoCantidad)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Compramos {totalImpactoCantidad >= 0 ? 'más' : 'menos'} insumos que los presupuestados.
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Driver principal</div>
            <div className="metric-value text-primary">
              {driverPrincipal === 'precio' ? 'Precio' : 'Cantidad'}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              La mayor parte de la desviación viene del {driverPrincipal === 'precio' ? 'precio pagado' : 'volumen comprado'}.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '320px 1fr' }}>
        {/* ── Lista de insumos ── */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-title text-sm">Insumos con compras ({conCompras.length})</div>
          <input
            type="text"
            placeholder="Buscar por código o nombre…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-200 rounded"
          />
          <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
            {filtrados.map(i => {
              const isSel = i.catalogo_id === seleccionado
              const variacion = i.variacion_pct || 0
              return (
                <button
                  key={i.catalogo_id}
                  onClick={() => setSeleccionado(i.catalogo_id)}
                  className={`w-full text-left p-2 rounded border-b border-gray-100 transition ${isSel ? 'bg-blue-50 border-l-4 border-l-primary' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono text-gray-400">{i.codigo}</div>
                      <div className="text-xs font-medium text-gray-800 truncate">{i.nombre}</div>
                    </div>
                    <div className="text-right">
                      <Sparkline data={i.sparkline} referencia={i.precio_referencia} width={70} height={22}
                        stroke={variacion > 5 ? '#ef4444' : variacion < -5 ? '#10b981' : '#6b7280'} />
                      <div className={`text-[10px] font-bold ${variacion > 0 ? 'text-red-600' : variacion < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {variacion > 0 ? '+' : ''}{variacion.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
            {filtrados.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-6">Sin resultados</div>
            )}
          </div>
        </div>

        {/* ── Detalle del insumo seleccionado ── */}
        <div>
          {lDet || !detalle ? (
            <div className="card"><Loader /></div>
          ) : (
            <DetalleInsumoPrecio detalle={detalle} fmt={fmt} />
          )}
        </div>
      </div>
    </>
  )
}

function DetalleInsumoPrecio({ detalle, fmt }) {
  const { insumo, compras, proveedores, kpis } = detalle

  // Color por proveedor (estable según índice)
  const colorProv = {}
  proveedores.forEach((p, idx) => { colorProv[p.proveedor] = PROVEEDOR_COLORS[idx % PROVEEDOR_COLORS.length] })

  const chartData = compras.map(c => ({
    fecha: c.fecha?.slice(0, 10),
    precio: c.precio_unitario,
    cantidad: c.cantidad,
    proveedor: c.proveedor,
    folio: c.folio
  }))

  // Series por proveedor para la gráfica de líneas multi-color
  const seriesPorProveedor = proveedores.map(p => ({
    proveedor: p.proveedor,
    color: colorProv[p.proveedor],
    puntos: chartData.filter(d => d.proveedor === p.proveedor)
  }))

  return (
    <>
      {/* ── KPIs ── */}
      <div className="card mb-3">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <div className="text-[11px] font-mono text-gray-400">{insumo.codigo}</div>
            <div className="text-lg font-semibold text-gray-800">{insumo.nombre}</div>
            <div className="text-xs text-gray-500">Unidad: {insumo.unidad} · Presupuesto: {insumo.cantidad_presupuestada} {insumo.unidad} a {fmt(insumo.precio_referencia)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Variación promedio vs ref.</div>
            <div className={`text-2xl font-black ${kpis.variacion_vs_ref_pct > 0 ? 'text-red-600' : kpis.variacion_vs_ref_pct < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
              {kpis.variacion_vs_ref_pct > 0 ? '+' : ''}{kpis.variacion_vs_ref_pct.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3">
          <Mini label="Mínimo"   value={fmt(kpis.precio_min)} />
          <Mini label="Promedio" value={fmt(kpis.precio_prom)} highlight />
          <Mini label="Máximo"   value={fmt(kpis.precio_max)} />
          <Mini label="Último"   value={kpis.ultimo_precio != null ? fmt(kpis.ultimo_precio) : '—'}
                hint={kpis.ultima_fecha ? kpis.ultima_fecha.slice(0,10) : ''} />
        </div>

        {/* Atribución del sobrecosto a este insumo */}
        <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
          <div className="bg-red-50/40 px-2 py-1.5 rounded">
            <div className="text-[10px] uppercase text-gray-500 font-semibold">Δ por precio</div>
            <div className={`text-sm font-bold ${kpis.impacto_precio >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {kpis.impacto_precio >= 0 ? '+' : ''}{fmt(kpis.impacto_precio)}
            </div>
            <div className="text-[10px] text-gray-400">(precio_prom − ref) × cant_comprada</div>
          </div>
          <div className="bg-amber-50/40 px-2 py-1.5 rounded">
            <div className="text-[10px] uppercase text-gray-500 font-semibold">Δ por cantidad</div>
            <div className={`text-sm font-bold ${kpis.impacto_cantidad >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {kpis.impacto_cantidad >= 0 ? '+' : ''}{fmt(kpis.impacto_cantidad)}
            </div>
            <div className="text-[10px] text-gray-400">(cant_real − cant_pres) × precio_ref</div>
          </div>
          <div className="bg-gray-50 px-2 py-1.5 rounded">
            <div className="text-[10px] uppercase text-gray-500 font-semibold">Sobrecosto total</div>
            <div className={`text-sm font-bold ${kpis.sobrecosto_total >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {kpis.sobrecosto_total >= 0 ? '+' : ''}{fmt(kpis.sobrecosto_total)}
            </div>
            <div className="text-[10px] text-gray-400">costo_real − presupuesto</div>
          </div>
        </div>
      </div>

      {/* ── Gráfica de evolución ── */}
      <div className="card mb-3">
        <div className="card-title">Evolución del precio unitario</div>
        <div className="text-[11px] text-gray-500 mb-3">
          Línea por proveedor · Línea punteada = precio de referencia (${insumo.precio_referencia.toFixed(2)})
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
                formatter={(v, n, props) => {
                  if (n === 'precio') return [`$${Number(v).toFixed(2)}`, 'Precio unit.']
                  return [v, n]
                }}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <ReferenceLine y={insumo.precio_referencia} stroke="#94a3b8" strokeDasharray="4 4"
                label={{ value: 'Ref.', position: 'right', fontSize: 10, fill: '#64748b' }} />
              {seriesPorProveedor.map(s => (
                <Line
                  key={s.proveedor}
                  type="monotone"
                  data={s.puntos}
                  dataKey="precio"
                  name={s.proveedor || '(sin proveedor)'}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: s.color }}
                  activeDot={{ r: 6 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tabla por proveedor ── */}
      {proveedores.length > 1 && (
        <div className="card mb-3">
          <div className="card-title">Comparativa por proveedor</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 border-y border-gray-200">
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Proveedor</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Compras</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Cant. total</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Precio prom.</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Mín–Máx</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Costo total</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map(p => (
                  <tr key={p.proveedor} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colorProv[p.proveedor] }} />
                      <span className="font-medium text-gray-700">{p.proveedor || '(sin proveedor)'}</span>
                    </td>
                    <td className="px-3 py-2 text-right">{p.num_compras}</td>
                    <td className="px-3 py-2 text-right">{p.cant_total} {insumo.unidad}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(p.precio_prom)}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500">{fmt(p.precio_min)} – {fmt(p.precio_max)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(p.costo_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tabla detallada de compras ── */}
      <div className="card">
        <div className="card-title">Detalle de compras ({compras.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-y border-gray-200">
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Folio</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Proveedor</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Cantidad</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Precio unit.</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right">vs Ref.</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {compras.map(c => {
                const diffPct = insumo.precio_referencia > 0
                  ? ((c.precio_unitario - insumo.precio_referencia) / insumo.precio_referencia) * 100
                  : 0
                return (
                  <tr key={c.detalle_id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{c.fecha?.slice(0, 10)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{c.folio}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colorProv[c.proveedor] }} />
                      {c.proveedor}
                    </td>
                    <td className="px-3 py-2 text-right">{c.cantidad} {insumo.unidad}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(c.precio_unitario)}</td>
                    <td className={`px-3 py-2 text-right text-xs font-bold ${diffPct > 0 ? 'text-red-600' : diffPct < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(c.subtotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function Mini({ label, value, hint, highlight }) {
  return (
    <div className={`px-2 py-1.5 rounded ${highlight ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <div className="text-[10px] uppercase text-gray-500 font-semibold">{label}</div>
      <div className={`text-sm font-bold ${highlight ? 'text-primary' : 'text-gray-800'}`}>{value}</div>
      {hint && <div className="text-[10px] text-gray-400">{hint}</div>}
    </div>
  )
}
