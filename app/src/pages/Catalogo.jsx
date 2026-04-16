import { useState, useMemo } from 'react'
import { Badge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { fmt } from '../lib/utils'
import { getObras, getAPI, createCatalogo, updateCatalogo, toggleCatalogo, getExplosionInsumos } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const EMPTY = { codigo: '', nombre: '', descripcion: '', unidad: 'pieza', categoria: '', precio_referencia: '', cantidad_presupuestada: '', status: 'Activo' }

// Barra de avance visual
const BarraAvance = ({ comprado, presupuestado }) => {
  if (!presupuestado) return <span className="text-gray-300 text-xs">—</span>
  const pct = Math.min((comprado / presupuestado) * 100, 100)
  const sobre = comprado > presupuestado
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: sobre ? '#dc2626' : '#185FA5' }}
        />
      </div>
      <span className={`text-xs font-semibold whitespace-nowrap ${sobre ? 'text-red-600' : 'text-gray-600'}`}>
        {pct.toFixed(0)}%{sobre ? ' ⚠' : ''}
      </span>
    </div>
  )
}

export default function Catalogo() {
  const queryClient = useQueryClient()

  const { data: obras = [], isLoading: loadObras } = useQuery({ queryKey: ['obras'], queryFn: getObras })
  const [obraId, setObraId] = useState(null)
  const activeObraId = obraId || obras[0]?.id || null

  const { data: prods = [], isLoading: loadProds } = useQuery({
    queryKey: ['catalogo_obras', activeObraId],
    queryFn: () => getAPI(`/api/catalogo?obra_id=${activeObraId}`),
    enabled: !!activeObraId
  })

  // Datos de avance real (cantidad comprada por concepto)
  const { data: avance = [] } = useQuery({
    queryKey: ['explosion', activeObraId],
    queryFn: () => getExplosionInsumos(activeObraId),
    enabled: !!activeObraId
  })

  // Mapa para lookup rápido id → datos de avance
  const avanceMap = useMemo(() => {
    const m = {}
    avance.forEach(a => { m[a.codigo] = a })
    return m
  }, [avance])

  const [q,      setQ]      = useState('')
  const [show,   setShow]   = useState(false)
  const [editId, setEditId] = useState(null)
  const [form,   setForm]   = useState(EMPTY)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['catalogo_obras', activeObraId] })
    queryClient.invalidateQueries({ queryKey: ['explosion', activeObraId] })
    queryClient.invalidateQueries({ queryKey: ['avances_obras'] })
  }

  const mutCreate = useMutation({ mutationFn: createCatalogo, onSuccess: () => { invalidate(); setShow(false); setEditId(null) } })
  const mutUpdate = useMutation({ mutationFn: ({ id, data }) => updateCatalogo(id, data), onSuccess: () => { invalidate(); setShow(false); setEditId(null) } })
  const mutToggle = useMutation({ mutationFn: toggleCatalogo, onSuccess: () => invalidate() })

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const filtered = useMemo(() =>
    prods.filter(p => {
      const match = q.toLowerCase()
      return (p.nombre || '').toLowerCase().includes(match) || (p.codigo || '').toLowerCase().includes(match)
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
      cantidad_presupuestada: p.cantidad_presupuestada || '',
      status: p.status
    })
    setEditId(p.id)
    setShow(true)
  }
  const cancel = () => { setShow(false); setEditId(null) }

  const save = () => {
    if (!form.nombre) return alert('El nombre es requerido')
    if (!activeObraId) return alert('Seleccione una obra')
    const payload = {
      ...form,
      obra_id: parseInt(activeObraId),
      precio_referencia: parseFloat(form.precio_referencia) || 0,
      cantidad_presupuestada: parseFloat(form.cantidad_presupuestada) || 0
    }
    if (editId) mutUpdate.mutate({ id: editId, data: payload })
    else mutCreate.mutate(payload)
  }

  const toggle = id => mutToggle.mutate(id)
  const isSaving = mutCreate.isPending || mutUpdate.isPending
  const isLoading = loadObras || (loadProds && prods.length === 0)

  const handleExportExcel = () => {
    window.open(`/api/reportes/explosion-insumos/${activeObraId}/excel`, '_blank')
  }

  if (isLoading) {
    return <div><div className="page-title">Catálogo de insumos por Obra</div><Loader /></div>
  }

  const activeObra = obras.find(o => o.id === activeObraId)
  const totalPresupuesto = prods.reduce((s, p) => s + ((p.cantidad_presupuestada || 0) * (p.precio_referencia || 0)), 0)
  const totalReal = avance.reduce((s, a) => s + (a.costo_real || 0), 0)
  const pctGlobal = totalPresupuesto > 0 ? Math.min((totalReal / totalPresupuesto) * 100, 100) : 0

  return (
    <div>
      <div className="page-title">Catálogo de insumos por Obra</div>
      <div className="page-sub">Presupuesto y avance real de materiales por proyecto</div>

      {/* Tabs por obra */}
      <div className="flex flex-wrap gap-2 mb-5">
        {obras.map(o => (
          <button
            key={o.id}
            onClick={() => setObraId(o.id)}
            className={`tab ${activeObraId === o.id ? 'tab-active' : ''}`}
          >
            {o.nombre}
            <span className={`ml-1.5 text-xs px-1.5 rounded-full ${o.status === 'Activa' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {o.status}
            </span>
          </button>
        ))}
      </div>

      {/* Métricas de la obra activa */}
      {activeObra && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="metric-card">
            <div className="metric-label">Conceptos</div>
            <div className="metric-value">{prods.length}</div>
            <div className="metric-sub">insumos en catálogo</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Presupuesto total</div>
            <div className="metric-value text-primary">{fmt(totalPresupuesto)}</div>
            <div className="metric-sub">cant. × precio ref.</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Gasto real acumulado</div>
            <div className={`metric-value ${totalReal > totalPresupuesto ? 'text-red-600' : 'text-gray-900'}`}>{fmt(totalReal)}</div>
            <div className="metric-sub">por facturas capturadas</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avance presupuestal</div>
            <div className={`metric-value ${pctGlobal >= 90 ? 'text-red-500' : pctGlobal >= 70 ? 'text-yellow-600' : 'text-emerald-600'}`}>
              {pctGlobal.toFixed(1)}%
            </div>
            <div className="mt-1.5">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pctGlobal}%`, background: pctGlobal >= 90 ? '#dc2626' : pctGlobal >= 70 ? '#d97706' : '#1D9E75' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de búsqueda + botones */}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <input
          className="flex-1 min-w-[200px] text-sm px-2.5 py-[7px] border border-gray-200 rounded-md outline-none focus:border-primary transition-colors"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="🔍 Buscar por nombre o código…"
        />
        {activeObraId && prods.length > 0 && (
          <button className="btn text-xs px-3 py-[7px] flex items-center gap-1.5" onClick={handleExportExcel} title="Descargar Excel de avance">
            ↓ Excel
          </button>
        )}
        {activeObraId && (
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo concepto</button>
        )}
      </div>

      {/* Formulario */}
      {show && (
        <div className="card">
          <div className="card-title">{editId ? 'Editar concepto' : `Nuevo concepto — ${activeObra?.nombre}`}</div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="field">
              <label>Código interno</label>
              <input value={form.codigo} onChange={set('codigo')} placeholder="Ej. P-007" />
            </div>
            <div className="field">
              <label>Nombre del insumo / concepto</label>
              <input value={form.nombre} onChange={set('nombre')} placeholder="Cemento 50kg" />
            </div>
            <div className="field">
              <label>Unidad de medida</label>
              <select value={form.unidad} onChange={set('unidad')}>
                <option>pieza</option><option>m²</option><option>m³</option>
                <option>kg</option><option>litro</option><option>costal</option>
                <option>metro</option><option>varilla</option><option>ton</option>
              </select>
            </div>
            <div className="field">
              <label>Categoría</label>
              <select value={form.categoria} onChange={set('categoria')}>
                <option value="">— Seleccionar —</option>
                <option>concreto</option><option>acero</option><option>block</option>
                <option>madera</option><option>agregados</option><option>herramienta</option>
                <option>acabados</option><option>mano de obra</option>
              </select>
            </div>
            <div className="field">
              <label>Costo unitario de referencia ($)</label>
              <input type="number" value={form.precio_referencia} onChange={set('precio_referencia')} placeholder="185.00" />
            </div>
            <div className="field">
              <label>Cantidad presupuestada</label>
              <input type="number" value={form.cantidad_presupuestada} onChange={set('cantidad_presupuestada')} placeholder="500" />
            </div>
            <div className="field col-span-2">
              <label>Descripción / Notas (opcional)</label>
              <input value={form.descripcion} onChange={set('descripcion')} placeholder="Descripción breve" />
            </div>
          </div>

          {form.precio_referencia && form.cantidad_presupuestada && (
            <div className="alert alert-info mt-3">
              Costo estimado: <strong>{fmt((parseFloat(form.cantidad_presupuestada) || 0) * (parseFloat(form.precio_referencia) || 0))}</strong>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary" onClick={save} disabled={isSaving}>
              {isSaving ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Agregar concepto')}
            </button>
            <button className="btn" onClick={cancel} disabled={isSaving}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabla con barras de avance */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <div className="card-title mb-0">Conceptos — {activeObra?.nombre || '...'} ({filtered.length})</div>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Unidad</th>
                <th className="text-right border-l">Presupuestado</th>
                <th className="text-right">Precio Ref.</th>
                <th className="text-right">Total Est.</th>
                <th className="border-l">Avance Real</th>
                <th className="text-right">Comprado</th>
                <th className="text-right">Gasto Real</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                // Buscar el avance por código
                const av = avance.find(a => {
                  // Intentar match por nombre si no por codigo
                  return a.concepto === p.nombre
                }) || { cant_comprada: 0, costo_real: 0 }
                const cantComprada = av.cant_comprada || 0
                const costoReal = av.costo_real || 0

                return (
                  <tr key={p.id} style={{ opacity: p.status === 'Inactivo' ? 0.45 : 1 }}>
                    <td>
                      <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-mono">
                        {p.codigo || '—'}
                      </span>
                    </td>
                    <td className="font-medium text-gray-800">{p.nombre}</td>
                    <td className="text-gray-500 text-sm">{p.unidad}</td>
                    <td className="text-right border-l font-medium">{p.cantidad_presupuestada}</td>
                    <td className="text-right text-gray-600">{fmt(p.precio_referencia)}</td>
                    <td className="text-right font-medium text-primary">{fmt((p.cantidad_presupuestada || 0) * (p.precio_referencia || 0))}</td>
                    <td className="border-l min-w-[120px] px-3">
                      <BarraAvance comprado={cantComprada} presupuestado={p.cantidad_presupuestada} />
                    </td>
                    <td className="text-right">
                      <span className={`font-semibold ${cantComprada > p.cantidad_presupuestada ? 'text-red-600' : cantComprada > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                        {cantComprada > 0 ? cantComprada : '—'}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={`font-semibold ${costoReal > (p.cantidad_presupuestada * p.precio_referencia) ? 'text-red-600' : costoReal > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                        {costoReal > 0 ? fmt(costoReal) : '—'}
                      </span>
                    </td>
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
                          {p.status === 'Activo' ? 'Desact.' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="11" className="text-center text-gray-400 py-8">
                  {prods.length === 0
                    ? 'Esta obra no tiene conceptos. Agrega manualmente o importa un Excel desde la sección Obras.'
                    : 'Sin resultados para la búsqueda.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {prods.length > 0 && (
          <div className="flex justify-between items-center mt-3 p-3 bg-gray-50 rounded-b-md border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Gasto real: <span className={`font-bold ${totalReal > totalPresupuesto ? 'text-red-600' : 'text-gray-800'}`}>{fmt(totalReal)}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500 mr-4">Presupuesto total estimado:</span>
              <span className="font-bold text-lg text-primary">{fmt(totalPresupuesto)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
