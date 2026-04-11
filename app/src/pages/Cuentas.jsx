import { useState, useEffect } from 'react'
import { Loader } from '../components/Loader'
import { getCheques, getCredito, createCheque, createCredito, getObras } from '../lib/api'
import { fmt, today } from '../lib/utils'

export default function Cuentas() {
  const [tab, setTab] = useState('cheques')
  
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)

  // States for Cheques
  const [cheques, setCheques] = useState([])
  const [cForm, setCForm] = useState({ fecha: today(), beneficiario: '', cargo: '', abono: '', obra_id: '' })
  const [cSaved, setCSaved] = useState(false)
  
  // States for Credito
  const [credito, setCredito] = useState([])
  const [tForm, setTForm] = useState({ fecha: today(), beneficiario: '', cargo: '', abono: '', obra_id: '' })
  const [tSaved, setTSaved] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const [_ch, _cr, _obs] = await Promise.all([getCheques(), getCredito(), getObras()])
      setCheques(_ch)
      setCredito(_cr)
      setObras(_obs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Calcs for Cheques
  const cSaldoAnterior = cheques.length > 0 ? cheques[cheques.length - 1].saldo : 0
  const cCargoVal = parseFloat(cForm.cargo) || 0
  const cAbonoVal = parseFloat(cForm.abono) || 0
  const cSaldoNuevo = cSaldoAnterior - cCargoVal + cAbonoVal

  // Calcs for Credito (Debt logic: Cargo increases debt, Abono decreases debt)
  const limiteCredito = 50000
  const tSaldoAnterior = credito.length > 0 ? credito[credito.length - 1].saldo : 0
  const tCargoVal = parseFloat(tForm.cargo) || 0
  const tAbonoVal = parseFloat(tForm.abono) || 0
  const tSaldoNuevo = tSaldoAnterior + tCargoVal - tAbonoVal

  const registrarCheque = async () => {
    if (!cForm.fecha || !cForm.beneficiario) return alert("Fecha y Beneficiario son requeridos")
    if (cCargoVal === 0 && cAbonoVal === 0) return alert("Se requiere Cargo o Abono")
    
    setLoading(true)
    try {
      await createCheque({
        ...cForm,
        cargo: cCargoVal,
        abono: cAbonoVal,
        obra_id: cForm.obra_id || null
      })
      await load()
      setCForm({ fecha: today(), beneficiario: '', cargo: '', abono: '', obra_id: '' })
      setCSaved(true)
      setTimeout(() => setCSaved(false), 3000)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const registrarCredito = async () => {
    if (!tForm.fecha || !tForm.beneficiario) return alert("Fecha y Beneficiario son requeridos")
    if (tCargoVal === 0 && tAbonoVal === 0) return alert("Se requiere Cargo o Abono")
    
    setLoading(true)
    try {
      await createCredito({
        ...tForm,
        cargo: tCargoVal,
        abono: tAbonoVal,
        obra_id: tForm.obra_id || null
      })
      await load()
      setTForm({ fecha: today(), beneficiario: '', cargo: '', abono: '', obra_id: '' })
      setTSaved(true)
      setTimeout(() => setTSaved(false), 3000)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  if (loading && cheques.length === 0 && credito.length === 0) {
    return (
      <div>
        <div className="page-title">Cuentas bancarias</div>
        <div className="page-sub">Cuenta de cheques y tarjeta de crédito</div>
        <Loader />
      </div>
    )
  }

  return (
    <div>
      <div className="page-title">Cuentas bancarias</div>
      <div className="page-sub">Cuenta de cheques y tarjeta de crédito</div>

      <div className="flex gap-2 mb-4">
        <button className={`tab ${tab === 'cheques' ? 'tab-active' : ''}`} onClick={() => setTab('cheques')}>
          Cuenta cheques
        </button>
        <button className={`tab ${tab === 'credito' ? 'tab-active' : ''}`} onClick={() => setTab('credito')}>
          Tarjeta crédito
        </button>
      </div>

      {/* ── Cheques ── */}
      {tab === 'cheques' && (
        <>
          <div className="saldo-box">
            <div>
              <div className="text-xs text-gray-500">Saldo inicial</div>
              <div className="text-lg font-semibold">{fmt(cheques[0]?.abono || 0)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Saldo actual</div>
              <div className="text-2xl font-semibold text-gray-900">
                {fmt(cSaldoAnterior)}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Registrar movimiento</div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={cForm.fecha} onChange={e => setCForm({...cForm, fecha: e.target.value})} />
              </div>
              <div className="field">
                <label>Beneficiario</label>
                <input placeholder="A quién se pagó / De quién se cobró" value={cForm.beneficiario} onChange={e => setCForm({...cForm, beneficiario: e.target.value})} />
              </div>
              <div className="field">
                <label>Obra (Opcional)</label>
                <select value={cForm.obra_id} onChange={e => setCForm({...cForm, obra_id: e.target.value})}>
                  <option value="">-- Gasto General --</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Cargo (Salida de dinero $-$)</label>
                <input type="number" value={cForm.cargo} onChange={e => setCForm({...cForm, cargo: e.target.value})} placeholder="0" />
              </div>
              <div className="field">
                <label>Abono (Entrada de dinero $+$)</label>
                <input type="number" value={cForm.abono} onChange={e => setCForm({...cForm, abono: e.target.value})} placeholder="0" />
              </div>
              <div className="field">
                <label>Saldo resultante</label>
                <input readOnly value={fmt(cSaldoNuevo)} className="font-semibold" />
              </div>
            </div>
            <div className="alert alert-info">
              Fórmula: Saldo anterior − Cargo + Abono = Saldo nuevo
            </div>
            {cSaved && <div className="alert alert-success mt-3">✓ Movimiento registrado.</div>}
            <div className="mt-3">
              <button className="btn btn-primary" onClick={registrarCheque} disabled={loading}>Registrar movimiento</button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Estado de cuenta (Cheques)</div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Fecha</th><th>Beneficiario</th><th>Cargo</th>
                    <th>Abono</th><th>Saldo</th><th>Obra</th>
                  </tr>
                </thead>
                <tbody>
                  {cheques.map(m => (
                    <tr key={m.id}>
                      <td className="text-gray-400 text-xs">#{m.id}</td>
                      <td>{m.fecha}</td><td>{m.beneficiario}</td>
                      <td className="text-red-600">{m.cargo > 0 ? fmt(m.cargo) : '—'}</td>
                      <td className="text-emerald-600">{m.abono > 0 ? fmt(m.abono) : '—'}</td>
                      <td className="font-medium bg-gray-50">{fmt(m.saldo)}</td>
                      <td>{m.obra_nombre || 'General'}</td>
                    </tr>
                  ))}
                  {cheques.length === 0 && (
                    <tr><td colSpan="7" className="text-center text-gray-400">Sin movimientos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Tarjeta de Crédito ── */}
      {tab === 'credito' && (
        <>
          <div className="saldo-box">
            <div>
              <div className="text-xs text-gray-500">Límite de crédito disponible</div>
              <div className="text-lg font-semibold">{fmt(limiteCredito - tSaldoAnterior)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Saldo usado (Deuda actual)</div>
              <div className="text-2xl font-semibold text-warning">{fmt(tSaldoAnterior)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Registrar pago o compra en tarjeta</div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={tForm.fecha} onChange={e => setTForm({...tForm, fecha: e.target.value})} />
              </div>
              <div className="field">
                <label>Establecimiento / Beneficiario</label>
                <input placeholder="Establecimiento" value={tForm.beneficiario} onChange={e => setTForm({...tForm, beneficiario: e.target.value})} />
              </div>
              <div className="field">
                <label>Obra (Opcional)</label>
                <select value={tForm.obra_id} onChange={e => setTForm({...tForm, obra_id: e.target.value})}>
                  <option value="">-- Gasto General --</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Cargo (Nueva Deuda $+$)</label>
                <input type="number" value={tForm.cargo} onChange={e => setTForm({...tForm, cargo: e.target.value})} placeholder="0" />
              </div>
              <div className="field">
                <label>Abono (Pago a Tarjeta $-$)</label>
                <input type="number" value={tForm.abono} onChange={e => setTForm({...tForm, abono: e.target.value})} placeholder="0" />
              </div>
              <div className="field">
                <label>Saldo resultante (Deuda futura)</label>
                <input readOnly value={fmt(tSaldoNuevo)} className="font-semibold text-warning" />
              </div>
            </div>
            <div className="alert alert-info">
              Fórmula: Deuda anterior + Cargo (Compras) − Abono (Pagos) = Saldo nuevo
            </div>
            {tSaved && <div className="alert alert-success mt-3">✓ Movimiento registrado.</div>}
            <div className="mt-3">
              <button className="btn btn-primary" onClick={registrarCredito} disabled={loading}>Registrar en Tarjeta</button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Movimientos tarjeta</div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Fecha</th><th>Establecimiento</th><th>Cargo</th>
                    <th>Abono</th><th>Saldo (Deuda)</th><th>Obra</th>
                  </tr>
                </thead>
                <tbody>
                  {credito.map(m => (
                    <tr key={m.id}>
                      <td className="text-gray-400 text-xs">#{m.id}</td>
                      <td>{m.fecha}</td><td>{m.beneficiario}</td>
                      <td className="text-red-600">{m.cargo > 0 ? fmt(m.cargo) : '—'}</td>
                      <td className="text-emerald-600">{m.abono > 0 ? fmt(m.abono) : '—'}</td>
                      <td className="font-medium text-warning bg-orange-50/50">{fmt(m.saldo)}</td>
                      <td>{m.obra_nombre || 'General'}</td>
                    </tr>
                  ))}
                  {credito.length === 0 && (
                    <tr><td colSpan="7" className="text-center text-gray-400">Sin movimientos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
