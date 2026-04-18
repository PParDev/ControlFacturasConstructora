import express from 'express'
import cors    from 'cors'
import db      from './db.js'

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
import importadorRouter from './routes/importador.js'

const app  = express()
const PORT = process.env.PORT || 3001

// Seed: ensure exactly the two static accounts exist
;(() => {
  const n = db.prepare('SELECT COUNT(*) as n FROM cuentas_bancarias').get().n
  if (n === 0) {
    db.prepare(`INSERT INTO cuentas_bancarias (nombre, tipo, saldo_inicial, saldo_actual) VALUES (?, ?, 0, 0)`)
      .run('Cuenta de Cheques', 'Cheques')
    db.prepare(`INSERT INTO cuentas_bancarias (nombre, tipo, saldo_inicial, saldo_actual) VALUES (?, ?, 0, 0)`)
      .run('Tarjeta de Crédito', 'Crédito')
    console.log('✅ Cuentas iniciales creadas: Cuenta de Cheques y Tarjeta de Crédito')
  }
})()

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
app.use('/api/importador',  importadorRouter)

// ── Health check ─────────────────────────────────────────────
app.get('/api/ping', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// ── Manejo global de errores ──────────────────────────────────
app.use((err, req, res, _next) => {
  // Log completo en servidor para diagnóstico
  console.error(`❌ [${new Date().toISOString()}] ${req.method} ${req.path}`)
  console.error('   Mensaje:', err.message)
  if (err.stack) console.error('   Stack:', err.stack)

  // Errores de negocio (lanzados con throw new Error en servicios)
  if (err.status) {
    return res.status(err.status).json({ error: err.message })
  }

  // Error genérico — se devuelve el mensaje (uso interno, ayuda al debug)
  res.status(500).json({ error: err.message || 'Error interno del servidor' })
})

app.listen(PORT, () => {
  console.log(`🚀 Constructora API corriendo en http://localhost:${PORT}`)
  console.log(`   GET http://localhost:${PORT}/api/ping  ← health check`)
})
