const NAV = [
  { id: 'dashboard', icon: '▦', label: 'Dashboard'  },
  { id: 'obras',     icon: '⌂', label: 'Obras'      },
  { id: 'pedidos',   icon: '📋', label: 'Pedidos'   },
  { id: 'recepcion', icon: '✓', label: 'Entregas'   },
  { id: 'facturas',  icon: '◻', label: 'Facturas'   },
  { id: 'pagos',     icon: '$', label: 'Pagos'       },
  { id: 'gastos',    icon: '◈', label: 'Gastos'      },
  { id: 'cuentas',   icon: '⬡', label: 'Cuentas'    },
  { id: 'catalogo',  icon: '☰', label: 'Catálogo'   },
  { id: 'reportes',  icon: '↗', label: 'Reportes'   },
]

export function Sidebar({ active, setActive }) {
  return (
    <aside className="w-[190px] bg-white border-r border-gray-200 flex flex-col fixed top-0 bottom-0 z-10">
      <div className="px-4 py-3.5 border-b border-gray-200">
        <div className="text-[13px] font-semibold text-gray-900">Control de Obras</div>
        <div className="text-[11px] text-gray-500 mt-0.5">Sistema administrativo</div>
      </div>

      <nav className="py-2 flex-1 overflow-y-auto">
        {NAV.map(n => (
          <div
            key={n.id}
            className={`nav-item ${active === n.id ? 'nav-item-active' : ''}`}
            onClick={() => setActive(n.id)}
          >
            <span>{n.icon}</span>
            {n.label}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200">
        <div className="text-[11px] text-gray-500">Usuario activo</div>
        <div className="text-[13px] font-semibold text-gray-900">Administrador</div>
      </div>
    </aside>
  )
}
