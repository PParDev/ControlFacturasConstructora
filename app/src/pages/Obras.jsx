import React, { useState } from 'react'
import { Badge } from '../components/Badge'
import { Loader } from '../components/Loader'
import { fmt } from '../lib/utils'
import { importarCatalogo, getObras, createObra, updateObra, deleteObra } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const EMPTY = { nombre: '', cliente: '', ubicacion: '', fecha_inicio: '', fecha_cierre: '', status: 'Activa' }

export default function Obras() {
  const queryClient = useQueryClient()
  const { data: obras = [], isLoading } = useQuery({ queryKey: ['obras'], queryFn: getObras })

  const [show, setShow]   = useState(false)
  const [form, setForm]   = useState(EMPTY)
  const [isEditing, setIsEditing] = useState(false)

  const mutCreate = useMutation({
    mutationFn: createObra,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      setForm(EMPTY)
      setShow(false)
    }
  })

  const mutUpdate = useMutation({
    mutationFn: (d) => updateObra(d.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      setForm(EMPTY)
      setShow(false)
      setIsEditing(false)
    }
  })

  const mutDelete = useMutation({
    mutationFn: deleteObra,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
    }
  })

  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  
  const save = () => {
    if (!form.nombre) return
    if (isEditing) {
      mutUpdate.mutate(form)
    } else {
      mutCreate.mutate(form)
    }
  }

  const handleEdit = (obra) => {
    setForm(obra)
    setIsEditing(true)
    setShow(true)
  }

  const handleDelete = (id) => {
    if (confirm('¿Está seguro de archivar esta obra?\nEsto mantendrá su historial pero la marcará como Archivada.')) {
      mutDelete.mutate(id)
    }
  }

  const fileInputRef = React.useRef(null)
  const [uploadingId, setUploadingId] = useState(null)
  const [guiaOpen, setGuiaOpen] = useState(false)
  
  const mutUpload = useMutation({
    mutationFn: (formData) => importarCatalogo(formData),
    onSuccess: (res) => {
      alert(`Catálogo importado. ${res.insertados} conceptos insertados.`)
      setUploadingId(null)
    },
    onError: (err) => {
      alert(err.message)
      setUploadingId(null)
    }
  })

  const triggerUpload = (id) => {
    setUploadingId(id)
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file || !uploadingId) return
    const fd = new FormData()
    fd.append('excel', file)
    fd.append('obra_id', uploadingId)
    mutUpload.mutate(fd)
    e.target.value = ''
  }

  return (
    <div>
      <div className="page-title">Obras / Proyectos</div>
      <div className="page-sub">Catálogo central de obras</div>

      {/* Modal guía formato Excel */}
      {guiaOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setGuiaOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Formato del Excel para Catálogo</h3>
              <button onClick={() => setGuiaOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Tu archivo Excel debe tener <strong>exactamente estas columnas</strong> en la primera fila (la primera hoja se procesa):</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Columna</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Alternativas aceptadas</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Ejemplo</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Codigo', 'Código / CODIGO', 'P-001'],
                    ['Nombre', 'Concepto / Material', 'Varilla 3/8"'],
                    ['Unidad', 'U.M.', 'pieza'],
                    ['Cantidad', 'Cant', '1000'],
                    ['Precio', 'Costo / Precio Unitario', '45.00'],
                  ].map(([col, alt, ej]) => (
                    <tr key={col} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-mono text-blue-700 font-medium">{col}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{alt}</td>
                      <td className="px-3 py-2 text-gray-700">{ej}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <strong className="text-yellow-800">Importante:</strong>
              <ul className="text-yellow-700 mt-1 space-y-0.5 list-disc list-inside">
                <li>Formatos aceptados: <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong></li>
                <li>La primer fila debe ser el encabezado (nombres de columnas)</li>
                <li>Si un concepto ya existe en la obra, se agrega de nuevo</li>
                <li>Columnas extra son ignoradas automáticamente</li>
              </ul>
            </div>
            <button className="btn btn-primary w-full mt-4" onClick={() => setGuiaOpen(false)}>Entendido</button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <button className="btn btn-primary" onClick={() => {
          setForm(EMPTY)
          setIsEditing(false)
          setShow(true)
        }}>
          + Nueva obra
        </button>
      </div>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" onChange={handleFileChange} />

      {show && (
        <div className="card">
          <div className="card-title">{isEditing ? 'Editar Obra' : 'Registrar nueva obra'}</div>
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
                <option>Archivada</option>
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
            <button className="btn btn-primary" onClick={save} disabled={mutCreate.isPending || mutUpdate.isPending}>
              {(mutCreate.isPending || mutUpdate.isPending) ? 'Guardando...' : 'Guardar obra'}
            </button>
            <button className="btn" onClick={() => setShow(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {isLoading ? <Loader /> : (
        <div className="card">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Obra</th>
                  <th>Cliente</th>
                  <th>Ubicación</th>
                  <th>Gasto Est.</th>
                  <th>Estatus</th>
                  <th className="w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {obras.map(o => (
                  <tr key={o.id} className={o.status === 'Archivada' ? 'opacity-60' : ''}>
                    <td className="font-semibold text-gray-900">{o.nombre}</td>
                    <td>{o.cliente || '—'}</td>
                    <td>{o.ubicacion || '—'}</td>
                    <td>{fmt(o.gasto_acumulado || 0)}</td>
                    <td><Badge s={o.status} /></td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded"
                          onClick={() => handleEdit(o)}
                        >
                          Editar
                        </button>
                        <button 
                          className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-2 py-1 rounded flex items-center gap-1"
                          onClick={() => triggerUpload(o.id)}
                          disabled={uploadingId === o.id || mutUpload.isPending}
                          title="Importar catálogo de conceptos (Excel)"
                        >
                          {uploadingId === o.id && mutUpload.isPending ? 'Cargando...' : '↑ Excel'}
                        </button>
                        <button
                          className="text-xs bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 px-2 py-1 rounded"
                          onClick={() => setGuiaOpen(true)}
                          title="Ver formato requerido del Excel"
                        >
                          ?
                        </button>
                        {o.status !== 'Archivada' && (
                          <button 
                            className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded"
                            onClick={() => handleDelete(o.id)}
                            disabled={mutDelete.isPending}
                          >
                            Archivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {obras.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-gray-400">No hay obras registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
