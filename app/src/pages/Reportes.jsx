import { useState } from 'react'
import { FACTURAS_INIT, CHEQUES_INIT } from '../data/mockData'
import { Badge, CatBadge } from '../components/Badge'
import { fmt } from '../lib/utils'

export default function Reportes() {
  const [obra, setObra] = useState('Residencial Houston')
  const [tipo, setTipo] = useState('Resumen por obra')
  const [gen,  setGen]  = useState(true)

  const pending  = FACTURAS_INIT.filter(f => f.status === 'Pendiente')
  const totalPend = pending.reduce((s, f) => s + f.monto, 0)

  return (
    <div>
      <div className="page-title">Reportes</div>
      <div className="page-sub">Consulta filtrada por obra, fecha y categoría</div>

      {/* Filtros */}
      <div className="card">
        <div className="card-title">Filtros</div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="field">
            <label>Obra</label>
            <select value={obra} onChange={e => { setObra(e.target.value); setGen(false) }}>
              <option>Todas</option>
              <option>Residencial Houston</option>
              <option>Tulipán 234</option>
              <option>Pedregal Norte</option>
            </select>
          </div>
          <div className="field">
            <label>Tipo de reporte</label>
            <select value={tipo} onChange={e => { setTipo(e.target.value); setGen(false) }}>
              <option>Resumen por obra</option>
              <option>Facturas pendientes</option>
              <option>Recibido vs Facturado</option>
              <option>Gastos por fecha</option>
              <option>Estado de cuenta bancaria</option>
            </select>
          </div>
          <div className="field"><label>Fecha inicio</label><input type="date" /></div>
          <div className="field"><label>Fecha fin</label><input type="date" /></div>
        </div>
        <div className="mt-3">
          <button className="btn btn-primary" onClick={() => setGen(true)}>Generar reporte</button>
        </div>
      </div>

      {/* ── Resumen por obra ── */}
      {gen && tipo === 'Resumen por obra' && (
        <>
          <div className="card">
            <div className="card-title">Resumen — {obra}</div>
            <div className="grid grid-cols-4 gap-2.5">
              <div className="metric-card"><div className="metric-label">Material</div><div className="metric-value">$32,000</div></div>
              <div className="metric-card"><div className="metric-label">Mano de obra</div><div className="metric-value">$16,200</div></div>
              <div className="metric-card"><div className="metric-label">Caja chica</div><div className="metric-value">$6,000</div></div>
              <div className="metric-card"><div className="metric-label">Total</div><div className="metric-value text-primary">$54,200</div></div>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Detalle — {obra}</div>
            <table>
              <thead>
                <tr><th>Fecha</th><th>Categoría</th><th>Concepto</th><th>Monto</th></tr>
              </thead>
              <tbody>
                <tr><td>19/03</td><td><CatBadge s="Material" /></td><td>Varilla corrugada</td><td>$12,000</td></tr>
                <tr><td>15/03</td><td><CatBadge s="Mano de obra" /></td><td>Cuadrilla semana</td><td>$8,000</td></tr>
                <tr><td>10/03</td><td><CatBadge s="Material" /></td><td>Blocks y varilla</td><td>$20,000</td></tr>
                <tr><td>05/03</td><td><CatBadge s="Caja chica" /></td><td>Combustible</td><td>$1,200</td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Facturas pendientes ── */}
      {gen && tipo === 'Facturas pendientes' && (
        <div className="card">
          <div className="card-title">Facturas pendientes</div>
          <table>
            <thead>
              <tr><th>Folio</th><th>Proveedor</th><th>Obra</th><th>Monto</th><th>Estatus</th></tr>
            </thead>
            <tbody>
              {pending.map(f => (
                <tr key={f.id}>
                  <td>{f.folio}</td><td>{f.proveedor}</td><td>{f.obra}</td>
                  <td>{fmt(f.monto)}</td><td><Badge s={f.status} /></td>
                </tr>
              ))}
              <tr className="no-hover">
                <td colSpan={3} className="font-semibold !border-t-2 border-gray-300">Total pendiente</td>
                <td className="font-semibold !border-t-2 border-gray-300">{fmt(totalPend)}</td>
                <td className="!border-t-2 border-gray-300"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Recibido vs Facturado ── */}
      {gen && tipo === 'Recibido vs Facturado' && (
        <div className="card">
          <div className="card-title">Recibido vs Facturado — {obra}</div>
          <table>
            <thead>
              <tr><th>Producto</th><th>Recibido</th><th>Facturado</th><th>Diferencia</th><th>Estado</th></tr>
            </thead>
            <tbody>
              <tr><td>Varilla 3/8</td><td>100 pzas</td><td>100 pzas</td><td>—</td><td><Badge s="Correcto" /></td></tr>
              <tr><td>Alambrón</td><td>45 kg</td><td>45 kg</td><td>—</td><td><Badge s="Correcto" /></td></tr>
              <tr>
                <td>Blocks 15×20</td><td>480 pzas</td><td>480 pzas</td>
                <td className="text-success font-medium">20 no facturadas</td>
                <td><Badge s="Ajustado" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Estado de cuenta bancaria ── */}
      {gen && tipo === 'Estado de cuenta bancaria' && (
        <div className="card">
          <div className="card-title">Estado de cuenta — Cuenta cheques</div>
          <table>
            <thead>
              <tr><th>Fecha</th><th>Beneficiario</th><th>Cargo</th><th>Abono</th><th>Saldo</th><th>Obra</th></tr>
            </thead>
            <tbody>
              {CHEQUES_INIT.map(m => (
                <tr key={m.id}>
                  <td>{m.fecha}</td><td>{m.bene}</td>
                  <td>{m.cargo > 0 ? fmt(m.cargo) : '—'}</td>
                  <td>{m.abono > 0 ? fmt(m.abono) : '—'}</td>
                  <td className="font-medium">{fmt(m.saldo)}</td>
                  <td>{m.obra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
