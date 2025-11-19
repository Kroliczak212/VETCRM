const dashboardService = require('../services/dashboard.service');

class DashboardController {
  /**
   * Get admin dashboard statistics
   * GET /api/dashboard/admin
   */
  async getAdminStatistics(req, res, next) {
    try {
      const statistics = await dashboardService.getAdminStatistics();
      res.json(statistics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get receptionist dashboard statistics
   * GET /api/dashboard/receptionist
   */
  async getReceptionistStatistics(req, res, next) {
    try {
      const statistics = await dashboardService.getReceptionistStatistics();
      res.json(statistics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get doctor dashboard statistics
   * GET /api/dashboard/doctor
   */
  async getDoctorStatistics(req, res, next) {
    try {
      const doctorId = req.user.id; // From auth middleware
      const statistics = await dashboardService.getDoctorStatistics(doctorId);
      res.json(statistics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get client dashboard statistics
   * GET /api/dashboard/client
   */
  async getClientStatistics(req, res, next) {
    try {
      const clientId = req.user.id; // From auth middleware
      const statistics = await dashboardService.getClientStatistics(clientId);
      res.json(statistics);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
