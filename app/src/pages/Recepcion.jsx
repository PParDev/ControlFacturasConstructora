import { useState, useEffect } from 'react'
import { FlowIndicator } from '../components/FlowIndicator'
import { getRecepciones, createRecepcion, getObras, getPedidos } from '../lib/api'
import { Loader } from '../components/Loader'
import { fmt, today } from '../lib/utils'

const FLUJOS = [
  { title: 'Con pedido previo',  desc: 'Se hizo orden de compra antes'     },
  { title: 'Sin pedido formal',  desc: 'El proveedor ya sabía qué traer'   },
  { title: 'Solo factura',       desc: 'Llegó material y factura juntos'   },
]

const FLOWS = [
  [
    { label: 'Pedido OC', done: true  },
    { label: 'Recepción', active: true },
    { label: 'Factura'  },
    { label: 'Pago'     },
  ],
  [
    { label: 'Sin pedido',  optional: true },
    { label: 'Recepción',   active: true   },
    { label: 'Factura' },
    { label: 'Pago'    },
  ],
  [
    { label: 'Sin pedido',           optional: true },
    { label: 'Recepción + Factura',  active: true   },
    { label: 'Pago' },
  ],
]

const EMPTY = { obra_id: '', proveedor: '', producto: '', cantidad_recibida: '', entregado_por: '', recibido_por: '', pedido_id: '', fecha: today() }

export default function Recepcion() {
  const [flujo,       setFlujo]       = useState(0)
  const [recepciones, setRecepciones] = useState([])
  const [obras,       setObras]       = useState([])
  const [pedidos,     setPedidos]     = useState([])
  
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState(EMPTY)
  const [saved,   setSaved]   = useState(false)
  const [lastFolio, setLastFolio] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const [_rec, _obras, _pedidos] = await Promise.all([getRecepciones(), getObras(), getPedidos()])
      setRecepciones(_rec)
      setObras(_obras)
      const pends = _pedidos.filter(p => p.status !== 'Recibido')
      setPedidos(pends)
      
      let initForm = { ...form }
      if (_obras.length > 0 && !form.obra_id) initForm.obra_id = _obras[0].id
      if (pends.length > 0 && !form.pedido_id) initForm.pedido_id = pends[0].id
      setForm(initForm)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  
  // If flujo===0 and linking a pedido, pre-fill some info
  const activePedido = flujo === 0 ? pedidos.find(p => p.id == form.pedido_id) : null
  const pedidoCount  = activePedido ? activePedido.cantidad : 0
  const qRecibida    = parseInt(form.cantidad_recibida) || 0
  const faltante     = flujo === 0 && activePedido ? Math.max(0, pedidoCount - qRecibida) : 0
  const coincide     = flujo === 0 && activePedido && qRecibida > 0 && faltante === 0

  const handlePedidoSelect = (e) => {
    const pid = e.target.value
    const p = pedidos.find(x => x.id == pid)
    if (p) {
      setForm(f => ({ ...f, pedido_id: pid, obra_id: p.obra_id, proveedor: p.proveedor, producto: p.producto }))
    } else {
      setForm(f => ({ ...f, pedido_id: pid }))
    }
  }

  const save = async () => {
    if (!form.obra_id || !form.producto) return

    setLoading(true)
    try {
      const payload = {
        ...form,
        cantidad_recibida: parseFloat(form.cantidad_recibida),
        pedido_id: flujo === 0 ? form.pedido_id : null
      }
      const res = await createRecepcion(payload)
      await load()
      setLastFolio(res.folio)
      
      const pId = form.pedido_id // Keep just in case
      setForm(p => ({ ...p, producto: '', cantidad_recibida: '', pedido_id: pId }))
      
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  if (loading && recepciones.length === 0) {
    return (
      <div>
        <div className="page-title">Entregas en obra (Recepción)</div>
        <div className="page-sub pb-2">Registra lo que llegó realmente a la obra</div>
        <Loader />
      </div>
    )
  }

  return (
    <div>
      <div className="page-title">Entregas en obra (Recepción)</div>
      <div className="page-sub pb-2">Registra lo que llegó realmente a la obra — <span className="text-blue-600 font-semibold">(Paso Opcional)</span></div>

      <div className="alert alert-info mt-2 mb-4">
        ℹ️ Este paso es <strong>opcional</strong>. Puedes registrar la recepción aquí para verificar que llegue el material correcto, o si el proveedor es de confianza o pagas en otro lado, pasar directamente a <strong>Facturas</strong>.
      </div>

      <div className="card">
        <div className="card-title">¿Cómo llegó este material?</div>

        {/* Selector de flujo */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {FLUJOS.map((f, i) => (
            <div
              key={i}
              className={`flow-option ${flujo === i ? 'flow-option-sel' : ''}`}
              onClick={() => { setFlujo(i); setSaved(false) }}
            >
              <div className="text-sm font-medium text-gray-900 mb-1">{f.title}</div>
              <div className="text-xs text-gray-500">{f.desc}</div>
            </div>
          ))}
        </div>

        <FlowIndicator steps={FLOWS[flujo]} />

        {flujo === 0 && (
          <div className="field mb-3 mt-2">
            <label>Orden de compra (Pedido previo)</label>
            <select value={form.pedido_id} onChange={handlePedidoSelect} disabled={pedidos.length === 0}>
              {pedidos.map(p => (
                <option key={p.id} value={p.id}>{p.folio} — {p.producto} ({p.cantidad}u) / {p.proveedor}</option>
              ))}
            </select>
            {pedidos.length === 0 && <div className="text-xs text-red-500 mt-1">No hay pedidos pendientes para enlazar.</div>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="field">
            <label>Obra</label>
            <select value={form.obra_id} onChange={set('obra_id')} disabled={obras.length === 0 || (flujo === 0 && activePedido)}>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Proveedor</label>
            <input value={form.proveedor} onChange={set('proveedor')} placeholder="Nombre del proveedor" disabled={flujo === 0 && activePedido} />
          </div>
          <div className="field">
            <label>Producto / material</label>
            <input value={form.producto} onChange={set('producto')} placeholder="Ej. Blocks 15×20" disabled={flujo === 0 && activePedido} />
          </div>
          <div className="field">
            <label>Cantidad recibida</label>
            <input
              type="number"
              value={form.cantidad_recibida}
              onChange={e => { setForm(f => ({ ...f, cantidad_recibida: e.target.value })); setSaved(false) }}
              placeholder={activePedido ? activePedido.cantidad.toString() : ""}
            />
          </div>
          <div className="field">
            <label>Quién entregó (chofer, unidad)</label>
            <input value={form.entregado_por} onChange={set('entregado_por')} placeholder="Chofer / proveedor" />
          </div>
          <div className="field">
            <label>Quién recibió en obra</label>
            <input value={form.recibido_por} onChange={set('recibido_por')} placeholder="Encargado de obra" />
          </div>
        </div>

        {flujo === 0 && faltante > 0 && qRecibida > 0 && (
          <div className="alert alert-warning mt-3">
            ⚠ Pedido: {pedidoCount} — Recibido: {qRecibida} — Faltante: {faltante}. Registrar de todas maneras documentará la merma/faltante.
          </div>
        )}
        {coincide && (
          <div className="alert alert-success mt-3">
            ✓ Cantidad recibida coincide con la orden de compra.
          </div>
        )}
        {saved && (
          <div className="alert alert-success mt-3">
            ✓ Recepción confirmada. Folio asignado: {lastFolio}
          </div>
        )}

        <div className="mt-3">
          <button className="btn btn-primary" onClick={save} disabled={loading || (flujo === 0 && pedidos.length === 0)}>
            {loading ? 'Confirmando...' : 'Confirmar recepción'}
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="card">
        <div className="card-title">Recepciones recientes</div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Folio</th><th>Fecha</th><th>Obra</th>
                <th>Producto</th><th>Recibido</th><th>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {recepciones.map(r => (
                <tr key={r.id}>
                  <td className="font-medium text-gray-700">{r.folio}</td>
                  <td>{r.fecha}</td>
                  <td>{obras.find(o => o.id === r.obra_id)?.nombre || `Obra #${r.obra_id}`}</td>
                  <td>{r.producto}</td>
                  <td>{r.cantidad_recibida}</td>
                  <td>{r.proveedor}</td>
                </tr>
              ))}
              {recepciones.length === 0 && (
                <tr><td colSpan="6" className="text-center text-gray-400">No hay recepciones registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
