import * as reporteService from '../services/reporteService.js'

export const getReporteObra = (req, res) => {
  try {
    res.json(reporteService.getReporteObra(req.params.id))
  } catch (error) {
    if (error.message === 'Obra no encontrada') return res.status(404).json({ error: error.message })
    res.status(500).json({ error: error.message })
  }
}

export const getFacturasPendientes    = (req, res) => res.json(reporteService.getFacturasPendientesInfo())
export const getRecibidoVsFacturado   = (req, res) => res.json(reporteService.getRecibidoVsFacturado())
export const getEstadoCuenta          = (req, res) => res.json(reporteService.getEstadoCuenta(req.query.cuenta_id, req.query.desde, req.query.hasta))
export const getExplosionInsumos      = (req, res) => res.json(reporteService.getExplosionInsumos(req.params.id, req.query.hasta || null))
export const getAvancesObras          = (req, res) => res.json(reporteService.getAvancesObrasDetallado())
export const getHistorialVariaciones  = (req, res) => res.json(reporteService.getHistorialVariaciones(req.params.id))
export const getFlujoCaja             = (req, res) => res.json(reporteService.getFlujoCaja())
export const getGastoMensual          = (req, res) => res.json(reporteService.getGastoMensual(req.query.obra_id || null))
export const getRankingProveedores    = (req, res) => res.json(reporteService.getRankingProveedores(req.query.obra_id || null))
export const getGastosDirectosObra    = (req, res) => res.json(reporteService.getGastosDirectosObra(req.params.obra_id))

export const exportarExplosionExcel = (req, res) => {
  try {
    const { buffer, obraNombre } = reporteService.exportarExplosionExcel(req.params.id)
    const filename = `Explosion_Insumos_${obraNombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
