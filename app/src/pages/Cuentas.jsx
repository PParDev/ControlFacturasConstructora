import { useState } from 'react'
import { Loader } from '../components/Loader'
import { fmt, today } from '../lib/utils'
import { getCuentas, getTransacciones, createTransaccion, getObras, updateSaldoInicial } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function Cuentas() {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState(null)
  const [form, setForm] = useState({ fecha: today(), beneficiario: '', concepto: '', monto: '', tipo: 'Cargo', obra_id: '' })
  const [saved, setSaved] = useState(false)

  const { data: cuentas = [], isLoading: loadCuentas } = useQuery({ queryKey: ['cuentas'], queryFn: getCuentas })
  const { data: obras = [] } = useQuery({ queryKey: ['obras'], queryFn: getObras })

  const cuentaActiva = cuentas.find(c => c.id === activeId) || cuentas[0]
  const activeTabId  = cuentaActiva?.id || null

  const { data: transacciones = [], isLoading: loadTrans } = useQuery({
    queryKey: ['transacciones', activeTabId],
    queryFn:  () => getTransacciones(activeTabId),
    enabled:  !!activeTabId
  })

  const mutacion = useMutation({
    mutationFn: (data) => createTransaccion(activeTabId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones', activeTabId] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setForm({ fecha: today(), beneficiario: '', concepto: '', monto: '', tipo: 'Cargo', obra_id: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err) => alert(err.message)
  })

  const registrar = () => {
    const monto = parseFloat(form.monto)
    if (!monto || monto <= 0) return alert('El monto debe ser mayor a 0')
    if (!form.fecha || !form.beneficiario) return alert('Fecha y Beneficiario son requeridos')
    mutacion.mutate({ ...form, monto, obra_id: form.obra_id || null })
  }

  if (loadCuentas) return <div><div className="page-title">Cuentas</div><Loader /></div>

  const esCredito = cuentaActiva?.tipo === 'Crédito'
  const disponible = cuentas.filter(c => c.tipo !== 'Crédito').reduce((s, c) => s + c.saldo_actual, 0)
  const deuda      = cuentas.filter(c => c.tipo === 'Crédito').reduce((s, c) => s + c.saldo_actual, 0)

  const totalCargos = transacciones.filter(t => t.tipo === 'Cargo').reduce((s, t) => s + t.monto, 0)
  const totalAbonos = transacciones.filter(t => t.tipo === 'Abono').reduce((s, t) => s + t.monto, 0)

  return (
    <div>
      <div className="page-title">Cuentas</div>
      <div className="page-sub">Estado de cuenta y registro de movimientos</div>

      {/* Métricas globales */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="metric-card">
          <div className="metric-label">Saldo disponible total</div>
          <div className="metric-value text-emerald-600">{fmt(disponible)}</div>
          <div className="metric-sub">Cuenta de cheques</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Deuda en crédito</div>
          <div className="metric-value text-orange-500">{fmt(deuda)}</div>
          <div className="metric-sub">Tarjeta de crédito</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Posición neta</div>
          <div className={`metric-value ${disponible - deuda >= 0 ? 'text-primary' : 'text-red-600'}`}>
            {fmt(disponible - deuda)}
          </div>
          <div className="metric-sub">Disponible − Deuda</div>
        </div>
      </div>

      {/* Tabs por cuenta */}
      <div className="flex gap-2 mb-4">
        {cuentas.map(c => (
          <button
            key={c.id}
            className={`tab ${(activeId || cuentas[0]?.id) === c.id ? 'tab-active' : ''}`}
            onClick={() => setActiveId(c.id)}
          >
            {c.nombre}
            <span className={`ml-2 text-xs font-semibold ${c.tipo === 'Crédito' ? 'text-orange-500' : 'text-emerald-600'}`}>
              {fmt(c.saldo_actual)}
            </span>
          </button>
        ))}
        {cuentas.length === 0 && (
          <p className="text-sm text-gray-400">No hay cuentas registradas. Contacta al administrador para configurarlas.</p>
        )}
      </div>

      {cuentaActiva && (
        <>
          {/* Saldo de la cuenta seleccionada */}
          <div className="saldo-box mb-4">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Saldo inicial</div>
              <div className="flex items-center gap-2">
                <div className="text-lg font-semibold text-gray-700">{fmt(cuentaActiva.saldo_inicial)}</div>
                <button
                  className="text-xs text-primary hover:underline bg-blue-50 px-2 py-1 rounded"
                  onClick={async () => {
                    const val = prompt('Nuevo saldo inicial para ' + cuentaActiva.nombre + ':', cuentaActiva.saldo_inicial)
                    if (val !== null && val.trim() !== '') {
                      const num = parseFloat(val)
                      if (!isNaN(num)) {
                        try {
                          await updateSaldoInicial(cuentaActiva.id, num)
                          queryClient.invalidateQueries({ queryKey: ['cuentas'] })
                          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
                        } catch (err) {
                          alert(err.message)
                        }
                      } else {
                        alert('Valor inválido')
                      }
                    }
                  }}
                >
                  Editar
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1">{cuentaActiva.tipo}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-0.5">{esCredito ? 'Deuda actual' : 'Saldo disponible'}</div>
              <div className={`text-3xl font-bold ${esCredito ? 'text-orange-500' : 'text-gray-900'}`}>
                {fmt(cuentaActiva.saldo_actual)}
              </div>
              {!esCredito && (
                <div className="text-xs text-gray-400 mt-1">
                  Cargos: {fmt(totalCargos)} · Abonos: {fmt(totalAbonos)}
                </div>
              )}
            </div>
          </div>

          {/* Formulario de movimiento */}
          <div className="card">
            <div className="card-title">
              Registrar movimiento en <span className="text-primary">{cuentaActiva.nombre}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="field">
                <label>Tipo de movimiento</label>
                <div className="flex rounded-md overflow-hidden border border-gray-200">
                  <button
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${form.tipo === 'Cargo' ? (esCredito ? 'bg-orange-500 text-white' : 'bg-red-500 text-white') : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => setForm(f => ({ ...f, tipo: 'Cargo' }))}
                  >
                    {esCredito ? 'Cargo (Compra)' : 'Cargo (Gasto)'}
                  </button>
                  <button
                    className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${form.tipo === 'Abono' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => setForm(f => ({ ...f, tipo: 'Abono' }))}
                  >
                    {esCredito ? 'Abono (Pago)' : 'Abono (Ingreso)'}
                  </button>
                </div>
              </div>

              <div className="field">
                <label>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>

              <div className="field">
                <label>Monto ($)</label>
                <input type="number" min="0" step="0.01" value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0.00" />
              </div>

              <div className="field">
                <label>Beneficiario / Origen <span className="text-red-500">*</span></label>
                <input value={form.beneficiario} onChange={e => setForm(f => ({ ...f, beneficiario: e.target.value }))}
                  placeholder={esCredito ? 'Ej. Home Depot, Oxxo Gas' : 'Ej. Familia Martínez, Préstamo'} />
              </div>

              <div className="field">
                <label>Concepto / Notas (Opcional)</label>
                <input value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
                  placeholder="Descripción del movimiento" />
              </div>

              <div className="field">
                <label>Asignar a Obra (Opcional)</label>
                <select value={form.obra_id} onChange={e => setForm(f => ({ ...f, obra_id: e.target.value }))}>
                  <option value="">— Movimiento General —</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
            </div>

            {saved && <div className="alert alert-success mt-3">✓ Movimiento registrado correctamente.</div>}

            <div className="mt-4">
              <button
                className={`btn ${form.tipo === 'Cargo' ? (esCredito ? 'btn-warning' : 'bg-red-600 text-white hover:bg-red-700 rounded px-4 py-[7px] text-sm font-medium transition-colors') : 'btn-primary'}`}
                onClick={registrar}
                disabled={mutacion.isPending}
              >
                {mutacion.isPending ? 'Registrando...' : `Registrar ${form.tipo}`}
              </button>
            </div>
          </div>

          {/* Historial de transacciones */}
          <div className="card">
            <div className="card-title">Historial de movimientos — {cuentaActiva.nombre}</div>
            <div className="relative min-h-[80px]">
              {loadTrans ? <Loader /> : (
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th><th>Tipo</th><th>Beneficiario</th>
                        <th>Concepto</th><th className="text-right">Monto</th><th>Obra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transacciones.map(t => (
                        <tr key={t.id}>
                          <td className="whitespace-nowrap text-sm">{t.fecha}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.tipo === 'Cargo' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                              {t.tipo}
                            </span>
                          </td>
                          <td className="font-medium text-gray-900">{t.beneficiario}</td>
                          <td className="text-gray-500 text-sm max-w-[200px] truncate">{t.concepto || '—'}</td>
                          <td className={`text-right font-semibold ${t.tipo === 'Cargo' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {t.tipo === 'Cargo' ? '−' : '+'}{fmt(t.monto)}
                          </td>
                          <td className="text-gray-400 text-sm">{t.obra_nombre || 'General'}</td>
                        </tr>
                      ))}
                      {transacciones.length === 0 && (
                        <tr><td colSpan="6" className="text-center text-gray-400 py-4">Sin movimientos en esta cuenta</td></tr>
                      )}
                    </tbody>
                  </table>

                  {transacciones.length > 0 && (
                    <div className="flex justify-end gap-8 p-3 bg-gray-50 border-t border-gray-200 text-sm mt-1 rounded-b">
                      <span>Total Cargos: <strong className="text-red-600">{fmt(totalCargos)}</strong></span>
                      <span>Total Abonos: <strong className="text-emerald-600">{fmt(totalAbonos)}</strong></span>
                      <span>Saldo actual: <strong className={esCredito ? 'text-orange-500' : 'text-gray-900'}>{fmt(cuentaActiva.saldo_actual)}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
