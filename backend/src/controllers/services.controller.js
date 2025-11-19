const servicesService = require('../services/services.service');
const asyncHandler = require('../utils/async-handler');

class ServicesController {
  getAll = asyncHandler(async (req, res) => {
    const result = await servicesService.getAll(req.query);
    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const service = await servicesService.getById(req.params.id);
    res.json({ service });
  });

  create = asyncHandler(async (req, res) => {
    const service = await servicesService.create(req.body);
    res.status(201).json({
      message: 'Service created successfully',
      service
    });
  });

  update = asyncHandler(async (req, res) => {
    const service = await servicesService.update(req.params.id, req.body);
    res.json({
      message: 'Service updated successfully',
      service
    });
  });

  delete = asyncHandler(async (req, res) => {
    const result = await servicesService.delete(req.params.id);
    res.json(result);
  });

  getCategories = asyncHandler(async (req, res) => {
    const categories = await servicesService.getCategories();
    res.json({ categories });
  });
}

module.exports = new ServicesController();
