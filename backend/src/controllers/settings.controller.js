const settingsService = require('../services/settings.service');

class SettingsController {
  /**
   * Get all settings
   * GET /api/settings
   */
  async getAll(req, res, next) {
    try {
      const settings = await settingsService.getAll();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get setting by key
   * GET /api/settings/:key
   */
  async getByKey(req, res, next) {
    try {
      const setting = await settingsService.getByKey(req.params.key);
      res.json(setting);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update setting by key
   * PATCH /api/settings/:key
   */
  async update(req, res, next) {
    try {
      const { value } = req.body;
      const setting = await settingsService.update(req.params.key, value);
      res.json(setting);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update multiple settings at once
   * PATCH /api/settings
   */
  async updateBulk(req, res, next) {
    try {
      const result = await settingsService.updateBulk(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new setting
   * POST /api/settings
   */
  async create(req, res, next) {
    try {
      const setting = await settingsService.create(req.body);
      res.status(201).json(setting);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete setting
   * DELETE /api/settings/:key
   */
  async delete(req, res, next) {
    try {
      const result = await settingsService.delete(req.params.key);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initialize default settings
   * POST /api/settings/initialize-defaults
   */
  async initializeDefaults(req, res, next) {
    try {
      const result = await settingsService.initializeDefaults();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();
