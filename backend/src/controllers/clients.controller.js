const clientsService = require('../services/clients.service');
const asyncHandler = require('../utils/async-handler');

class ClientsController {
  getAll = asyncHandler(async (req, res) => {
    const result = await clientsService.getAll(req.query);
    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const client = await clientsService.getById(req.params.id);
    res.json({ client });
  });

  create = asyncHandler(async (req, res) => {
    const client = await clientsService.create(req.body);
    res.status(201).json({
      message: 'Client created successfully',
      client
    });
  });

  update = asyncHandler(async (req, res) => {
    const client = await clientsService.update(req.params.id, req.body);
    res.json({
      message: 'Client updated successfully',
      client
    });
  });

  delete = asyncHandler(async (req, res) => {
    const result = await clientsService.delete(req.params.id);
    res.json(result);
  });

  getPets = asyncHandler(async (req, res) => {
    const pets = await clientsService.getPets(req.params.id);
    res.json({ pets });
  });
}

module.exports = new ClientsController();
