import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPedidos, getRecepciones, getFacturas, getObras } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, ShoppingCart, Box, FileText, ArrowRight } from 'lucide-react'
import { Loader } from '../components/Loader'
import { fmt } from '../lib/utils'

export default function CentroCompras() {
  const navigate = useNavigate()

  const { data: pedidos = [], isLoading: lPed } = useQuery({ queryKey: ['pedidos'], queryFn: getPedidos })
  const { data: recepciones = [], isLoading: lRec } = useQuery({ queryKey: ['recepciones'], queryFn: getRecepciones })
  const { data: facturas = [], isLoading: lFac } = useQuery({ queryKey: ['facturas'], queryFn: getFacturas })
  const { data: obras = [], isLoading: lObr } = useQuery({ queryKey: ['obras'], queryFn: getObras })
  const { data: recPendientes = [], isLoading: lRP } = useQuery({ 
    queryKey: ['recepciones_pendientes'], 
    queryFn: async () => {
      const res = await fetch('/api/recepciones/pendientes')
      return res.json()
    } 
  })

  if (lPed || lRec || lFac || lObr || lRP) {
    return <div><div className="page-title">Centro de Suministros</div><Loader /></div>
  }

  // 1. Órdenes pendientes de recibir (No están en recepciones)
  const pedidosPendientes = pedidos.reduce((acc, current) => {
    if (current.status !== 'Pendiente') return acc;
    if (!acc[current.folio]) acc[current.folio] = []
    acc[current.folio].push(current)
    return acc
  }, {})

  // 2. Recepciones sin facturar (Ahora vienen agrupadas del backend)

  // Para compatibilidad y simplicidad, usaremos recPendientes directamente en la columna 2

  // 3. Facturas pendientes de pago
  const facturasPendientes = facturas.filter(f => f.status === 'Pendiente')

  const getObraNombre = (id) => obras.find(o => o.id === id)?.nombre || `Obra #${id}`

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <div className="page-title mb-0">Tablero de Compras</div>
          <div className="page-sub pb-0">Controla el flujo de suministros desde el requerimiento hasta el pago</div>
        </div>
        
        <div className="mt-4 sm:mt-0 flex gap-2">
          <button onClick={() => navigate('/pedidos')} className="btn btn-primary flex items-center gap-1.5 shadow-sm">
            <PlusCircle size={16} /> Iniciar Trámite General
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* COLUMNA 1: Pedidos por Recibir */}
        <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded"><ShoppingCart size={18} /></div>
            <h3 className="font-bold text-gray-800">Órdenes en Tránsito</h3>
            <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">{Object.keys(pedidosPendientes).length}</span>
          </div>

          <div className="flex-1 space-y-3">
            {Object.entries(pedidosPendientes).map(([folio, items]) => (
              <div key={folio} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-sm text-gray-800">{folio}</div>
                  <div className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">Por recibir</div>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  <span className="font-semibold text-gray-700">{items[0].proveedor}</span> • {getObraNombre(items[0].obra_id)}
                  <br />
                  <span className="text-gray-400">{items.length} insumo(s) solicitados</span>
                </div>
                <button 
                  onClick={() => navigate('/recepcion', { state: { pedido_folio: folio } })}
                  className="w-full mt-1 bg-gray-50 hover:bg-blue-50 text-blue-600 border border-gray-200 hover:border-blue-300 text-xs py-1.5 rounded font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  Registrar llegada <ArrowRight size={14} />
                </button>
              </div>
            ))}
            {Object.keys(pedidosPendientes).length === 0 && (
              <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                No hay órdenes de compra en tránsito.
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 2: Recepciones sin facturar */}
        <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <div className="p-1.5 bg-orange-100 text-orange-600 rounded"><Box size={18} /></div>
            <h3 className="font-bold text-gray-800">Pendiente de Facturar</h3>
            <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">{recPendientes.length}</span>
          </div>

          <div className="flex-1 space-y-3">
            {recPendientes.map(rec => (
              <div key={rec.folio} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-sm text-gray-800">{rec.folio}</div>
                  <div className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-medium">Recibido</div>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  <span className="font-semibold text-gray-700">{rec.proveedor}</span> • {getObraNombre(rec.obra_id)}
                  <br />
                  <span className="text-gray-400">
                    {rec.total_items === 1 
                      ? `Insumo: ${rec.resumen_productos}` 
                      : `${rec.total_items} insumos recibidos`}
                  </span>
                </div>
                <button 
                  onClick={() => navigate('/facturas', { state: { folio: rec.folio } })}
                  className="w-full mt-1 bg-gray-50 hover:bg-orange-50 text-orange-600 border border-gray-200 hover:border-orange-300 text-xs py-1.5 rounded font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  Capturar Factura <ArrowRight size={14} />
                </button>
              </div>
            ))}
            {recPendientes.length === 0 && (
              <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                Todo el material recibido ha sido facturado.
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 3: Facturas por Pagar */}
        <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <div className="p-1.5 bg-red-100 text-red-600 rounded"><FileText size={18} /></div>
            <h3 className="font-bold text-gray-800">Cuentas por Pagar</h3>
            <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">{facturasPendientes.length}</span>
          </div>

          <div className="flex-1 space-y-3">
            {facturasPendientes.map(fac => (
              <div key={fac.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-sm text-gray-800">{fac.folio}</div>
                  <div className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-medium">Por pagar</div>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  <span className="font-semibold text-gray-700">{fac.proveedor}</span> • {fac.obra_nombre || getObraNombre(fac.obra_id)}
                  <div className="mt-1 font-bold text-gray-900 text-sm">{fmt(fac.monto)}</div>
                </div>
                <button 
                  onClick={() => navigate('/pagos', { state: { factura_id: fac.id } })}
                  className="w-full mt-1 bg-gray-50 hover:bg-red-50 text-red-600 border border-gray-200 hover:border-red-300 text-xs py-1.5 rounded font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  Registrar Pago <ArrowRight size={14} />
                </button>
              </div>
            ))}
            {facturasPendientes.length === 0 && (
              <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                No hay cuentas por pagar pendientes.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
