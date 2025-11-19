const paymentsService = require('../services/payments.service');

class PaymentsController {
  /**
   * Get all payments
   * GET /api/payments
   */
  async getAll(req, res, next) {
    try {
      const result = await paymentsService.getAll(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment by ID
   * GET /api/payments/:id
   */
  async getById(req, res, next) {
    try {
      const payment = await paymentsService.getById(parseInt(req.params.id));
      res.json(payment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment by appointment ID
   * GET /api/payments/appointment/:appointmentId
   */
  async getByAppointmentId(req, res, next) {
    try {
      const payment = await paymentsService.getByAppointmentId(
        parseInt(req.params.appointmentId)
      );
      res.json(payment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create payment
   * POST /api/payments
   */
  async create(req, res, next) {
    try {
      const payment = await paymentsService.create(req.body);
      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update payment (record payment)
   * PATCH /api/payments/:id
   */
  async update(req, res, next) {
    try {
      const payment = await paymentsService.update(
        parseInt(req.params.id),
        req.body
      );
      res.json(payment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete payment
   * DELETE /api/payments/:id
   */
  async delete(req, res, next) {
    try {
      const result = await paymentsService.delete(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment statistics
   * GET /api/payments/statistics
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await paymentsService.getStatistics();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentsController();
