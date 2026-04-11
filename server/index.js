import express from 'express'
import cors    from 'cors'

import obrasRouter      from './routes/obras.js'
import catalogoRouter   from './routes/catalogo.js'
import pedidosRouter    from './routes/pedidos.js'
import recepcionesRouter from './routes/recepciones.js'
import facturasRouter   from './routes/facturas.js'
import pagosRouter      from './routes/pagos.js'
import gastosRouter     from './routes/gastos.js'
import cuentasRouter    from './routes/cuentas.js'
import dashboardRouter  from './routes/dashboard.js'
import reportesRouter   from './routes/reportes.js'

const app  = express()
const PORT = process.env.PORT || 3001

// ── Middleware ────────────────────────────────────────────────
app.use(cors())
app.use(express.json())

// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/obras',       obrasRouter)
app.use('/api/catalogo',    catalogoRouter)
app.use('/api/pedidos',     pedidosRouter)
app.use('/api/recepciones', recepcionesRouter)
app.use('/api/facturas',    facturasRouter)
app.use('/api/pagos',       pagosRouter)
app.use('/api/gastos',      gastosRouter)
app.use('/api/cuentas',     cuentasRouter)
app.use('/api/dashboard',   dashboardRouter)
app.use('/api/reportes',    reportesRouter)

// ── Health check ─────────────────────────────────────────────
app.get('/api/ping', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// ── Manejo global de errores ──────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌ Error en servidor:', err.message)
  res.status(500).json({ error: 'Error interno del servidor', detail: err.message })
})

app.listen(PORT, () => {
  console.log(`🚀 Constructora API corriendo en http://localhost:${PORT}`)
  console.log(`   GET http://localhost:${PORT}/api/ping  ← health check`)
})
