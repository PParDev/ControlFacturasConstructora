import { useState, useEffect } from 'react'
import { Badge } from '../components/Badge'
import { FlowIndicator } from '../components/FlowIndicator'
import { Loader } from '../components/Loader'
import { getFacturas, createFactura, getRecepciones, getObras } from '../lib/api'
import { fmt, today } from '../lib/utils'

const FLOW = [
  { label: 'Recepción', done: true   },
  { label: 'Factura',   active: true  },
  { label: 'Pago' },
]

const EMPTY = { folio: '', proveedor: '', recepcion_id: '', monto: '', fecha: today(), obra_id: '', status: 'Pendiente' }

export default function Facturas() {
  const [facturas, setFacturas] = useState([])
  const [recepciones, setRecepciones] = useState([])
  const [obras, setObras] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const [_fac, _rec, _obras] = await Promise.all([getFacturas(), getRecepciones(), getObras()])
      setFacturas(_fac)
      setRecepciones(_rec)
      setObras(_obras)
      
      let initForm = { ...form }
      if (_obras.length > 0 && !form.obra_id) initForm.obra_id = _obras[0].id
      setForm(initForm)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const actRec = recepciones.find(r => r.id == form.recepcion_id)
  
  // As a logic mock from the original UI: limit based on received
  // In a real scenario, we'd multiply received quantity by unit price from order
  const MAX = actRec ? (actRec.cantidad_recibida || 1) * 100 : 9999999 

  const montoVal = parseFloat(form.monto) || 0
  const excede = actRec && montoVal > MAX

  const handleRecSelect = (e) => {
    const rid = e.target.value
    const rec = recepciones.find(r => r.id == rid)
    if (rec) {
      setForm(f => ({ ...f, recepcion_id: rid, obra_id: rec.obra_id, proveedor: rec.proveedor }))
    } else {
      setForm(f => ({ ...f, recepcion_id: rid }))
    }
  }

  const save = async () => {
    if (!form.folio || !form.proveedor || montoVal <= 0 || !form.obra_id) return
    
    setLoading(true)
    try {
      const payload = {
        ...form,
        monto: montoVal,
        recepcion_id: form.recepcion_id || null
      }
      await createFactura(payload)
      await load()
      setForm(p => ({ ...p, folio: '', monto: '' }))
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  if (loading && facturas.length === 0) {
    return (
      <div>
        <div className="page-title">Facturas</div>
        <div className="page-sub">Solo se registra lo que realmente se recibió</div>
        <Loader />
      </div>
    )
  }

  return (
    <div>
      <div className="page-title">Facturas</div>
      <div className="page-sub">Solo se registra lo que realmente se recibió</div>

      <FlowIndicator steps={FLOW} />

      <div className="card">
        <div className="card-title">Registrar factura</div>
        {obras.length === 0 && (
          <div className="alert alert-info mb-3">Primero debe registrar una Obra para asignarle la factura.</div>
        )}
        
        <div className="grid grid-cols-2 gap-2.5">
          <div className="field">
            <label>No. de factura</label>
            <input value={form.folio} onChange={set('folio')} placeholder="FAC-2026-0892" />
          </div>
          <div className="field">
            <label>Proveedor</label>
            <input value={form.proveedor} onChange={set('proveedor')} placeholder="Cementos Nayar" />
          </div>
          <div className="field">
            <label>Recepción relacionada (Opcional)</label>
            <select value={form.recepcion_id} onChange={handleRecSelect}>
              <option value="">-- Sin recepción vinculada --</option>
              {recepciones.map(r => (
                <option key={r.id} value={r.id}>{r.folio} — {r.producto} ({r.cantidad_recibida}u) / {r.proveedor}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monto de la factura</label>
            <input
              type="number"
              value={form.monto}
              onChange={e => { setForm(f => ({ ...f, monto: e.target.value })); setSaved(false) }}
              placeholder="48,000"
            />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={form.fecha} onChange={set('fecha')} />
          </div>
          <div className="field">
            <label>Obra</label>
            <select value={form.obra_id} onChange={set('obra_id')} disabled={obras.length === 0 || !!actRec}>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {actRec && (
          <div className="alert alert-warning mt-3">
            ⚠ Monto máximo facturable sugerido: {fmt(MAX)} ({actRec.cantidad_recibida} pzas calculadas).
          </div>
        )}
        {excede && (
          <div className="alert alert-error mt-2">
            ✗ El monto ({fmt(montoVal)}) excede el sugerido. No se permitirá registrar para proteger tus finanzas.
          </div>
        )}
        {saved && (
          <div className="alert alert-success mt-3">✓ Factura registrada correctamente.</div>
        )}

        <div className="mt-4">
          <button
            className="btn btn-primary"
            disabled={excede || loading || obras.length === 0}
            onClick={save}
          >
            {loading ? 'Registrando...' : 'Validar y registrar'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Facturas registradas</div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Factura</th><th>Proveedor</th><th>Obra</th>
                <th>Monto</th><th>Fecha</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map(f => (
                <tr key={f.id}>
                  <td className="font-medium text-gray-700">{f.folio}</td>
                  <td>{f.proveedor}</td>
                  <td>{obras.find(o => o.id === f.obra_id)?.nombre || `Obra #${f.obra_id}`}</td>
                  <td>{fmt(f.monto)}</td><td>{f.fecha}</td>
                  <td><Badge s={f.status} /></td>
                </tr>
              ))}
              {facturas.length === 0 && (
                <tr><td colSpan="6" className="text-center text-gray-400">No hay facturas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
