import { useState, useEffect } from 'react'
import { FlowIndicator } from '../components/FlowIndicator'
import { getPedidos, createPedido, getObras } from '../lib/api'
import { Loader } from '../components/Loader'
import { today } from '../lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const FLOW = [
  { label: 'Pedido',    active: true, optional: true },
  { label: 'Recepción', optional: true },
  { label: 'Factura' },
  { label: 'Pago' },
]

const EMPTY = { obra_id: '', proveedor: '', producto: '', cantidad: '', fecha: today(), notas: '' }

export default function Pedidos() {
  const queryClient = useQueryClient()
  
  const { data: pedidos = [], isLoading: isLoadingPedidos } = useQuery({ queryKey: ['pedidos'], queryFn: getPedidos })
  const { data: obras = [], isLoading: isLoadingObras } = useQuery({ queryKey: ['obras'], queryFn: getObras })

  const [form, setForm]       = useState(EMPTY)
  const [saved, setSaved]     = useState(false)
  const [lastFolio, setLastFolio] = useState('')

  const isLoading = isLoadingPedidos || isLoadingObras

  useEffect(() => {
    if (obras.length > 0 && !form.obra_id) {
      setForm(f => ({ ...f, obra_id: obras[0].id }))
    }
  }, [obras, form.obra_id])

  const mutation = useMutation({
    mutationFn: createPedido,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      setLastFolio(res.folio)
      setForm(p => ({ ...p, producto: '', cantidad: '', notas: '' }))
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    },
    onError: (err) => {
      console.error(err)
    }
  })

  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  
  const save = () => {
    if (!form.proveedor || !form.producto || !form.cantidad || !form.obra_id) return
    const payload = { ...form, cantidad: parseFloat(form.cantidad) }
    mutation.mutate(payload)
  }

  if (isLoading && pedidos.length === 0) {
    return (
      <div>
        <div className="page-title">Pedidos / Órdenes de Compra</div>
        <div className="page-sub pb-2">Registra un pedido formal a un proveedor</div>
        <FlowIndicator steps={FLOW} />
        <Loader />
      </div>
    )
  }

  return (
    <div>
      <div className="page-title">Pedidos / Órdenes de Compra</div>
      <div className="page-sub pb-2">Registra un pedido formal a un proveedor — <span className="text-blue-600 font-semibold">(Paso Opcional)</span></div>

      <FlowIndicator steps={FLOW} />

      <div className="alert alert-info mt-4 mb-4">
        ℹ️ Este paso es <strong>opcional</strong>. Si no haces pedidos formales, puedes pasar directamente a registrar la <strong>Recepción</strong> del material o la <strong>Factura</strong>.
      </div>

      <div className="card">
        <div className="card-title">Crear Nuevo Pedido</div>
        
        {obras.length === 0 && !isLoadingObras && (
          <div className="alert alert-info mb-3">Primero debe registrar una Obra para asignarle el pedido.</div>
        )}

        <div className="grid grid-cols-2 gap-3.5">
          <div className="field">
            <label>Obra</label>
            <select value={form.obra_id} onChange={set('obra_id')} disabled={obras.length === 0}>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Proveedor</label>
            <input value={form.proveedor} onChange={set('proveedor')} placeholder="Ej. El Toro, Cementos Nayar" />
          </div>
          <div className="field">
            <label>Producto a pedir</label>
            <input value={form.producto} onChange={set('producto')} placeholder="Ej. Varilla 3/8, Blocks 15x20" />
          </div>
          <div className="field">
            <label>Cantidad (Ej. Pzas, bultos, m³)</label>
            <input type="number" value={form.cantidad} onChange={set('cantidad')} placeholder="Ej. 500" />
          </div>
          <div className="field">
            <label>Fecha del pedido</label>
            <input type="date" value={form.fecha} onChange={set('fecha')} />
          </div>
          <div className="field">
            <label>Notas adicionales</label>
            <input value={form.notas} onChange={set('notas')} placeholder="Ej. Entregar antes de mediodía" />
          </div>
        </div>

        {saved && (
          <div className="alert alert-success mt-4">
            ✓ Pedido registrado correctamente. Folio generado: {lastFolio}
          </div>
        )}

        <div className="mt-4">
          <button className="btn btn-primary" onClick={save} disabled={mutation.isPending || obras.length === 0}>
            {mutation.isPending ? 'Generando...' : 'Generar Orden de Compra'}
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="card mt-4">
        <div className="card-title">Pedidos recientes</div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Folio</th><th>Fecha</th><th>Proveedor</th>
                <th>Obra</th><th>Producto</th><th>Cantidad</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map(p => (
                <tr key={p.id}>
                  <td className="font-medium text-gray-700">{p.folio}</td>
                  <td>{p.fecha}</td>
                  <td>{p.proveedor}</td>
                  <td>{obras.find(o => o.id === p.obra_id)?.nombre || `Obra #${p.obra_id}`}</td>
                  <td>{p.producto}</td>
                  <td>{p.cantidad}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium 
                      ${p.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.status || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
              {pedidos.length === 0 && !isLoadingPedidos && (
                <tr><td colSpan="7" className="text-center text-gray-400">No hay pedidos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
