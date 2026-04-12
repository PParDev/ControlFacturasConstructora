import { useState, useMemo } from 'react'
import { Badge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { fmt } from '../lib/utils'
import { getCatalogo, createCatalogo, updateCatalogo, toggleCatalogo } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const EMPTY = { codigo: '', nombre: '', descripcion: '', unidad: 'pieza', categoria: '', precio_referencia: '', proveedor_habitual: '', status: 'Activo' }

export default function Catalogo() {
  const queryClient = useQueryClient()
  const { data: prods = [], isLoading } = useQuery({ queryKey: ['catalogo'], queryFn: getCatalogo })
  
  const [q,      setQ]      = useState('')
  const [show,   setShow]   = useState(false)
  const [editId, setEditId] = useState(null)
  const [form,   setForm]   = useState(EMPTY)

  const mutCreate = useMutation({
    mutationFn: createCatalogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo'] })
      setShow(false); setEditId(null)
    }
  })

  const mutUpdate = useMutation({
    mutationFn: ({ id, data }) => updateCatalogo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo'] })
      setShow(false); setEditId(null)
    }
  })

  const mutToggle = useMutation({
    mutationFn: toggleCatalogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo'] })
    }
  })

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const filtered = useMemo(() =>
    prods.filter(p => {
      const match = q.toLowerCase()
      return (
        (p.nombre || '').toLowerCase().includes(match) ||
        (p.codigo || '').toLowerCase().includes(match) ||
        (p.categoria || '').toLowerCase().includes(match)
      )
    }),
    [prods, q]
  )

  const openNew  = () => { setForm(EMPTY); setEditId(null); setShow(true) }
  const openEdit = p  => { 
    setForm({ 
      codigo: p.codigo || '',
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      unidad: p.unidad || 'pieza',
      categoria: p.categoria || '',
      precio_referencia: p.precio_referencia || '',
      proveedor_habitual: p.proveedor_habitual || '',
      status: p.status
    }); 
    setEditId(p.id); 
    setShow(true) 
  }
  const cancel   = () => { setShow(false); setEditId(null) }

  const save = () => {
    if (!form.nombre) return alert('El nombre es requerido')
    
    // El backend espera precio_referencia
    const payload = { 
      ...form, 
      precio_referencia: parseFloat(form.precio_referencia) || 0 
    }
    
    if (editId) {
      mutUpdate.mutate({ id: editId, data: payload })
    } else {
      mutCreate.mutate(payload)
    }
  }

  const toggle = id => mutToggle.mutate(id)

  const isSaving = mutCreate.isPending || mutUpdate.isPending

  if (isLoading && prods.length === 0) {
    return (
      <div>
         <div className="page-title">Catálogo de insumos</div>
         <div className="page-sub">Productos y materiales del sistema</div>
         <Loader />
      </div>
    )
  }

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
              <input value={form.codigo} onChange={set('codigo')} placeholder="Opcional: P-007" />
            </div>
            <div className="field">
              <label>Nombre del producto</label>
              <input value={form.nombre} onChange={set('nombre')} placeholder="Cemento 50kg" />
            </div>
            <div className="field">
              <label>Descripción (opcional)</label>
              <input value={form.descripcion} onChange={set('descripcion')} placeholder="Descripción breve" />
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
              <select value={form.categoria} onChange={set('categoria')}>
                <option value="">— Seleccionar —</option>
                <option>concreto</option><option>acero</option><option>block</option>
                <option>madera</option><option>agregados</option><option>herramienta</option>
              </select>
            </div>
            <div className="field">
              <label>Precio unitario referencia</label>
              <input type="number" value={form.precio_referencia} onChange={set('precio_referencia')} placeholder="185.00" />
            </div>
            <div className="field">
              <label>Proveedor habitual</label>
              <input value={form.proveedor_habitual} onChange={set('proveedor_habitual')} placeholder="Nombre del proveedor" />
            </div>
            {/* El estatus no se edita en el form, usamos el botón toggle */}
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary" onClick={save} disabled={isSaving}>
              {isSaving ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Agregar producto')}
            </button>
            <button className="btn" onClick={cancel} disabled={isSaving}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabla de productos */}
      <div className="card">
        <div className="card-title">Productos ({filtered.length})</div>
        <div className="overflow-x-auto">
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
                  <td className="uppercase text-xs">{p.categoria}</td>
                  <td>{fmt(p.precio_referencia)}</td>
                  <td>{p.proveedor_habitual}</td>
                  <td><Badge s={p.status} /></td>
                  <td>
                    <div className="flex gap-1.5">
                      <button className="btn btn-sm" onClick={() => openEdit(p)}>Editar</button>
                      <button
                        className="btn btn-sm"
                        style={{ color: p.status === 'Activo' ? '#C0392B' : '#1D9E75' }}
                        onClick={() => toggle(p.id)}
                        disabled={mutToggle.isPending}
                      >
                        {p.status === 'Activo' ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="text-center text-gray-400">Sin materiales en el catálogo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
