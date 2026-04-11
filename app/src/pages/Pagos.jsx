import { useState, useEffect } from 'react'
import { Badge } from '../components/Badge'
import { FlowIndicator } from '../components/FlowIndicator'
import { Loader } from '../components/Loader'
import { fmt, today } from '../lib/utils'
import { getPagos, createPago, getFacturas, getObras } from '../lib/api'

const FLOW = [
  { label: 'Recepción', done: true   },
  { label: 'Factura',   done: true   },
  { label: 'Pago',      active: true },
]

const EMPTY = { factura_id: '', monto: '', formapago: 'Transferencia', referencia: '', fecha: today() }

export default function Pagos() {
  const [pagos, setPagos] = useState([])
  const [facturas, setFacturas] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const [_pagos, _facts, _obs] = await Promise.all([getPagos(), getFacturas(), getObras()])
      setPagos(_pagos)
      setObras(_obs)
      
      const pends = _facts.filter(f => f.status === 'Pendiente')
      setFacturas(pends)
      
      if (pends.length > 0 && !form.factura_id) {
        setForm(f => ({ ...f, factura_id: pends[0].id }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const actFac = facturas.find(f => f.id == form.factura_id)
  
  const save = async () => {
    if (!form.factura_id || !form.monto || !form.formapago) return
    
    setLoading(true)
    try {
      const payload = {
        factura_id: parseInt(form.factura_id),
        monto: parseFloat(form.monto),
        forma: form.formapago,
        referencia: form.referencia,
        fecha: form.fecha
      }
      await createPago(payload)
      await load()
      setForm(p => ({ ...p, monto: '', referencia: '' }))
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  if (loading && pagos.length === 0) {
    return (
      <div>
        <div className="page-title">Pagos</div>
        <div className="page-sub">Registro de pagos a proveedores</div>
        <FlowIndicator steps={FLOW} />
        <Loader />
      </div>
    )
  }

  return (
    <div>
      <div className="page-title">Pagos</div>
      <div className="page-sub">Registro de pagos a proveedores</div>

      <FlowIndicator steps={FLOW} />

      <div className="card">
        <div className="card-title">Registrar pago</div>
        
        {facturas.length === 0 && (
          <div className="alert alert-info mb-3">No hay facturas pendientes de pago registradas.</div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="field">
            <label>Factura pendiente</label>
            <select value={form.factura_id} onChange={set('factura_id')} disabled={facturas.length === 0}>
              {facturas.map(f => (
                <option key={f.id} value={f.id}>{f.folio} — {f.proveedor} ({fmt(f.monto)})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monto pagado</label>
            <input
              type="number" 
              value={form.monto} 
              onChange={e => { setForm(f => ({ ...f, monto: e.target.value })); setSaved(false) }}
              placeholder={actFac ? actFac.monto.toString() : ""}
            />
          </div>
          <div className="field">
            <label>Forma de pago</label>
            <select value={form.formapago} onChange={set('formapago')}>
              <option>Transferencia</option>
              <option>Cheque</option>
              <option>Efectivo</option>
              <option>Tarjeta Crédito</option>
            </select>
          </div>
          <div className="field">
            <label>Referencia</label>
            <input value={form.referencia} onChange={set('referencia')} placeholder="No. transferencia o cheque" />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={form.fecha} onChange={set('fecha')} />
          </div>
        </div>

        {saved && (
          <div className="alert alert-success mt-3">✓ Pago registrado correctamente.</div>
        )}
        <div className="mt-3">
          <button className="btn btn-primary" onClick={save} disabled={loading || facturas.length === 0}>
            {loading ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Historial de pagos</div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Factura ID</th><th>Proveedor</th>
                <th>Obra</th><th>Monto</th><th>Forma</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map(p => {
                const facInfo = p.factura_id
                return (
                  <tr key={p.id}>
                    <td>{p.fecha}</td>
                    <td className="font-medium text-gray-700">Factura #{p.factura_id}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>{fmt(p.monto)}</td>
                    <td>{p.forma}</td><td><Badge s="Pagado" /></td>
                  </tr>
                )
              })}
              {pagos.length === 0 && (
                <tr><td colSpan="7" className="text-center text-gray-400">No hay pagos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
