import * as dashboardService from '../services/dashboardService.js'

export const getDashboard = (req, res) => {
  res.json(dashboardService.getDashboardMetrics())
}
