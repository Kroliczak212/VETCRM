const penaltiesService = require('../services/penalties.service');
const { ForbiddenError } = require('../utils/errors');

class PenaltiesController {
  /**
   * Get all penalties
   * GET /api/penalties
   */
  async getAll(req, res, next) {
    try {
      const result = await penaltiesService.getAll(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get penalty by ID
   * GET /api/penalties/:id
   */
  async getById(req, res, next) {
    try {
      const penalty = await penaltiesService.getById(parseInt(req.params.id));

      // Authorization: client can only view their own penalties
      if (req.user.role === 'client' && penalty.client_user_id !== req.user.id) {
        throw new ForbiddenError('You can only view your own penalties');
      }

      res.json(penalty);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get penalties by client ID
   * GET /api/penalties/client/:clientId
   */
  async getByClientId(req, res, next) {
    try {
      const requestedClientId = parseInt(req.params.clientId);

      // Authorization: client can only view their own penalties
      if (req.user.role === 'client' && requestedClientId !== req.user.id) {
        throw new ForbiddenError('You can only view your own penalties');
      }

      const penalties = await penaltiesService.getByClientId(requestedClientId);
      res.json(penalties);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create penalty
   * POST /api/penalties
   */
  async create(req, res, next) {
    try {
      const penalty = await penaltiesService.create(req.body);
      res.status(201).json(penalty);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete penalty
   * DELETE /api/penalties/:id
   */
  async delete(req, res, next) {
    try {
      const result = await penaltiesService.delete(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get penalty statistics
   * GET /api/penalties/statistics
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await penaltiesService.getStatistics();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PenaltiesController();
