import { NavLink } from "react-router-dom"
import { 
  LayoutDashboard, 
  Building2, 
  ShoppingCart, 
  Box, 
  FileText, 
  CreditCard, 
  Receipt, 
  Wallet, 
  BookOpen, 
  BarChart3 
} from 'lucide-react'

export function Sidebar() {
  const menuItem = [
    {id: "dashboard", label: "Dashboard", icon:LayoutDashboard, path: "/dashboard"},
    {id: "obras", label: "Obras", icon:Building2, path: "/obras"},
    {id: "centro-compras", label: "Centro Compras", icon:ShoppingCart, path: "/centro-compras"},
    {id: "pedidos", label: "Pedidos", icon:FileText, path: "/pedidos"},
    {id: "recepcion", label: "Recepción", icon:Box, path: "/recepcion"},
    {id: "facturas", label: "Facturas", icon:Receipt, path: "/facturas"},
    {id: "pagos", label: "Pagos por Pagar", icon:CreditCard, path: "/pagos"},
    {id: "gastos", label: "Gastos (Caja)", icon:Wallet, path: "/gastos"},
    {id: "cuentas", label: "Cuentas", icon:Building2, path: "/cuentas"},
    {id: "catalogo", label: "Catálogo", icon:BookOpen, path: "/catalogo"},
    {id: "reportes", label: "Reportes", icon:BarChart3, path: "/reportes"},


  ]

  return (
    <aside className="w-[190px] bg-white border-r border-gray-200 flex flex-col fixed top-0 bottom-0 z-10">
      <div className="px-4 py-3.5 border-b border-gray-200">
        <div className="text-[13px] font-semibold text-gray-900">Constructora</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItem.map((item) => (
          <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive  }) => `
            flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
              ${isActive 
                ? 'bg-blue-50 text-blue-600 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'}
          `}
          >
            <item.icon size={20}/>
            <span className="text-sm"> {item.label} </span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200">
        <div className="text-[11px] text-gray-500">Usuario activo</div>
        <div className="text-[13px] font-semibold text-gray-900">Administrador</div>
      </div>
    </aside>
  )
}
