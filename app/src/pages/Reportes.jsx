import { useState } from 'react'
import { Badge, CatBadge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { fmt } from '../lib/utils'
import { getObras, getGastos, getFacturas, getCheques, getRecepciones, getPedidos } from '../lib/api'
import { useQuery } from '@tanstack/react-query'

export default function Reportes() {
  const [obraId, setObraId] = useState('Todas')
  const [tipo, setTipo] = useState('Resumen por obra')
  const [gen,  setGen]  = useState(true)

  const { data: obras = [], isLoading: lObr } = useQuery({ queryKey: ['obras'], queryFn: getObras })
  const { data: gastos = [], isLoading: lGas } = useQuery({ queryKey: ['gastos'], queryFn: getGastos })
  const { data: facturas = [], isLoading: lFac } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })
  const { data: cheques = [], isLoading: lCheq } = useQuery({ queryKey: ['cheques'], queryFn: getCheques })
  const { data: recepciones = [], isLoading: lRec } = useQuery({ queryKey: ['recepciones'], queryFn: getRecepciones })
  const { data: pedidos = [], isLoading: lPed } = useQuery({ queryKey: ['pedidos'], queryFn: getPedidos })

  const isLoading = lObr || lGas || lFac || lCheq || lRec || lPed

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
  const filteredCheq   = filterByObra(cheques)
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
            </select>
          </div>
        </div>
        <div className="mt-3">
          <button className="btn btn-primary" onClick={() => setGen(true)}>Generar reporte</button>
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
        <div className="card">
          <div className="card-title">Estado de cuenta (Cheques) — {getObraName()}</div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Beneficiario</th><th>Obra</th><th>Cargo</th><th>Abono</th><th>Saldo Cta</th></tr>
              </thead>
              <tbody>
                {filteredCheq.map(m => (
                  <tr key={m.id}>
                    <td>{m.fecha}</td>
                    <td>{m.beneficiario}</td>
                    <td>{m.obra_nombre || 'General'}</td>
                    <td className="text-red-600">{m.cargo > 0 ? fmt(m.cargo) : '—'}</td>
                    <td className="text-emerald-600">{m.abono > 0 ? fmt(m.abono) : '—'}</td>
                    <td className="font-medium bg-gray-50">{fmt(m.saldo)}</td>
                  </tr>
                ))}
                {filteredCheq.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-gray-400">Sin movimientos bancarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
