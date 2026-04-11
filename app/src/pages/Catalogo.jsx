import { useState, useMemo } from 'react'
import { CATALOGO_INIT } from '../data/mockData'
import { Badge } from '../components/Badge'
import { fmt } from '../lib/utils'

const EMPTY = { codigo: '', nombre: '', desc: '', unidad: 'pieza', cat: '', precio: '', prov: '', status: 'Activo' }

export default function Catalogo() {
  const [prods,  setProds]  = useState(CATALOGO_INIT)
  const [q,      setQ]      = useState('')
  const [show,   setShow]   = useState(false)
  const [editId, setEditId] = useState(null)
  const [form,   setForm]   = useState(EMPTY)

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const filtered = useMemo(() =>
    prods.filter(p =>
      p.nombre.toLowerCase().includes(q.toLowerCase()) ||
      p.codigo.toLowerCase().includes(q.toLowerCase()) ||
      p.cat.toLowerCase().includes(q.toLowerCase())
    ),
    [prods, q]
  )

  const openNew  = () => { setForm(EMPTY); setEditId(null); setShow(true) }
  const openEdit = p  => { setForm({ ...p }); setEditId(p.id); setShow(true) }
  const cancel   = () => { setShow(false); setEditId(null) }

  const save = () => {
    if (!form.codigo || !form.nombre) return
    const item = { ...form, precio: parseFloat(form.precio) || 0 }
    if (editId) setProds(p => p.map(x => x.id === editId ? { ...item, id: editId } : x))
    else        setProds(p => [...p, { ...item, id: Date.now() }])
    setShow(false); setEditId(null)
  }

  const toggle = id =>
    setProds(p => p.map(x =>
      x.id === id ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' } : x
    ))

  return (
    <div>
      <div className="page-title">Catálogo de insumos</div>
      <div className="page-sub">Productos y materiales del sistema — CRUD completo</div>

      {/* Barra de búsqueda */}
      <div className="flex gap-2 mb-4 items-center">
        <input
          className="flex-1 text-sm px-2.5 py-[7px] border border-gray-200 rounded-md outline-none focus:border-primary transition-colors"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, código o categoría…"
        />
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo producto</button>
      </div>

      {/* Formulario alta/edición */}
      {show && (
        <div className="card">
          <div className="card-title">{editId ? 'Editar producto' : 'Nuevo producto'}</div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="field">
              <label>Código interno</label>
              <input value={form.codigo} onChange={set('codigo')} placeholder="P-007" />
            </div>
            <div className="field">
              <label>Nombre del producto</label>
              <input value={form.nombre} onChange={set('nombre')} placeholder="Cemento 50kg" />
            </div>
            <div className="field">
              <label>Descripción (opcional)</label>
              <input value={form.desc} onChange={set('desc')} placeholder="Descripción breve" />
            </div>
            <div className="field">
              <label>Unidad de medida</label>
              <select value={form.unidad} onChange={set('unidad')}>
                <option>pieza</option><option>m²</option><option>m³</option>
                <option>kg</option><option>litro</option><option>costal</option>
                <option>metro</option><option>varilla</option>
              </select>
            </div>
            <div className="field">
              <label>Categoría</label>
              <select value={form.cat} onChange={set('cat')}>
                <option value="">— Seleccionar —</option>
                <option>concreto</option><option>acero</option><option>block</option>
                <option>madera</option><option>agregados</option><option>herramienta</option>
              </select>
            </div>
            <div className="field">
              <label>Precio unitario referencia</label>
              <input type="number" value={form.precio} onChange={set('precio')} placeholder="185.00" />
            </div>
            <div className="field">
              <label>Proveedor habitual</label>
              <input value={form.prov} onChange={set('prov')} placeholder="Nombre del proveedor" />
            </div>
            <div className="field">
              <label>Estatus</label>
              <select value={form.status} onChange={set('status')}>
                <option>Activo</option><option>Inactivo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary" onClick={save}>
              {editId ? 'Guardar cambios' : 'Agregar producto'}
            </button>
            <button className="btn" onClick={cancel}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabla de productos */}
      <div className="card">
        <div className="card-title">Productos ({filtered.length})</div>
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Nombre</th><th>Unidad</th><th>Categoría</th>
              <th>Precio ref.</th><th>Proveedor</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ opacity: p.status === 'Inactivo' ? 0.45 : 1 }}>
                <td>
                  <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-mono">
                    {p.codigo}
                  </span>
                </td>
                <td className="font-medium">{p.nombre}</td>
                <td>{p.unidad}</td>
                <td>{p.cat}</td>
                <td>{fmt(p.precio)}</td>
                <td>{p.prov}</td>
                <td><Badge s={p.status} /></td>
                <td>
                  <div className="flex gap-1.5">
                    <button className="btn btn-sm" onClick={() => openEdit(p)}>Editar</button>
                    <button
                      className="btn btn-sm"
                      style={{ color: p.status === 'Activo' ? '#C0392B' : '#1D9E75' }}
                      onClick={() => toggle(p.id)}
                    >
                      {p.status === 'Activo' ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
