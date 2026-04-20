// import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom' 
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
import CentroCompras from './pages/CentroCompras'
import ObraDetalle from './pages/ObraDetalle'
import { Toaster } from './components/Toaster'


export default function App() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar/>
      <main className="ml-[190px] flex-1 p-6 min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace/>} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/obras" element={<Obras />} />
          <Route path="/obras/:id" element={<ObraDetalle />} />
          <Route path="/centro-compras" element={<CentroCompras />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/recepcion" element={<Recepcion />} />
          <Route path="/facturas" element={<Facturas />} />
          <Route path="/pagos" element={<Pagos />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/cuentas" element={<Cuentas />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/reportes" element={<Reportes />} />

          <Route path="*" element={<div className='p-4'>Pagina no encontrada</div>}/>
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}
