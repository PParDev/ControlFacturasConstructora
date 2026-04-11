import { useState, useEffect } from 'react'
import { Badge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { fmt } from '../lib/utils'
import { getObras, createObra } from '../lib/api'

const EMPTY = { nombre: '', cliente: '', ubicacion: '', fecha_inicio: '', fecha_cierre: '', status: 'Activa' }

export default function Obras() {
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [show, setShow]   = useState(false)
  const [form, setForm]   = useState(EMPTY)

  useEffect(() => {
    loadObras()
  }, [])

  const loadObras = async () => {
    try {
      const data = await getObras()
      setObras(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  
  const save = async () => {
    if (!form.nombre) return
    setLoading(true)
    try {
      await createObra(form)
      await loadObras()
      setForm(EMPTY)
      setShow(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-title">Obras / Proyectos</div>
      <div className="page-sub">Catálogo de proyectos activos y terminados</div>

      <div className="mb-4">
        <button className="btn btn-primary" onClick={() => setShow(!show)}>
          + Nueva obra
        </button>
      </div>

      {show && (
        <div className="card">
          <div className="card-title">Registrar nueva obra</div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="field">
              <label>Nombre de la obra</label>
              <input value={form.nombre} onChange={set('nombre')} placeholder="Ej. Residencial Las Palmas" />
            </div>
            <div className="field">
              <label>Cliente</label>
              <input value={form.cliente} onChange={set('cliente')} placeholder="Nombre del cliente" />
            </div>
            <div className="field">
              <label>Ubicación</label>
              <input value={form.ubicacion} onChange={set('ubicacion')} placeholder="Calle, colonia" />
            </div>
            <div className="field">
              <label>Estatus</label>
              <select value={form.status} onChange={set('status')}>
                <option>Activa</option>
                <option>En pausa</option>
                <option>Terminada</option>
              </select>
            </div>
            <div className="field">
              <label>Fecha inicio</label>
              <input type="date" value={form.fecha_inicio} onChange={set('fecha_inicio')} />
            </div>
            <div className="field">
              <label>Fecha cierre estimada</label>
              <input type="date" value={form.fecha_cierre} onChange={set('fecha_cierre')} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary" onClick={save}>Guardar obra</button>
            <button className="btn" onClick={() => setShow(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <Loader /> : (
        <div className="grid grid-cols-2 gap-3">
          {obras.map(o => (
            <div key={o.id} className="card !mb-0 cursor-pointer hover:border-gray-400 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="text-sm font-semibold text-gray-900">{o.nombre}</div>
                <Badge s={o.status} />
              </div>
              <div className="text-xs text-gray-500">Cliente: {o.cliente || 'N/A'}</div>
              <div className="text-xs text-gray-500">Inicio: {o.fecha_inicio || 'N/A'}</div>
              {o.ubicacion && (
                <div className="text-xs text-gray-500">Ubicación: {o.ubicacion}</div>
              )}
              <div className="flex justify-between mt-3 pt-2.5 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {o.status === 'Terminada' ? 'Gasto total (est.)' : 'Gasto acumulado (est.)'}
                </span>
                <span className="text-[15px] font-semibold">{fmt(o.gasto || 0)}</span>
              </div>
            </div>
          ))}

          {obras.length === 0 && (
            <div className="text-sm text-gray-400 col-span-2">No hay obras registradas.</div>
          )}
        </div>
      )}
    </div>
  )
}
