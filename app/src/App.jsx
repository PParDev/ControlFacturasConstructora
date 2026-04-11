import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Obras from './pages/Obras'
import Pedidos from './pages/Pedidos'
import Recepcion from './pages/Recepcion'
import Facturas from './pages/Facturas'
import Pagos from './pages/Pagos'
import Gastos from './pages/Gastos'
import Cuentas from './pages/Cuentas'
import Catalogo from './pages/Catalogo'
import Reportes from './pages/Reportes'

const PAGES = {
  dashboard: Dashboard,
  obras: Obras,
  pedidos: Pedidos,
  recepcion: Recepcion,
  facturas: Facturas,
  pagos: Pagos,
  gastos: Gastos,
  cuentas: Cuentas,
  catalogo: Catalogo,
  reportes: Reportes,
}

export default function App() {
  const [active, setActive] = useState('dashboard')
  const Page = PAGES[active]
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar active={active} setActive={setActive} />
      <main className="ml-[190px] flex-1 p-6 min-h-screen">
        <Page />
      </main>
    </div>
  )
}
