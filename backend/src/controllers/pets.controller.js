const petsService = require('../services/pets.service');
const asyncHandler = require('../utils/async-handler');

class PetsController {
  getAll = asyncHandler(async (req, res) => {
    const result = await petsService.getAll(req.query, req.user);
    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const pet = await petsService.getById(req.params.id);
    res.json({ pet });
  });

  create = asyncHandler(async (req, res) => {
    const pet = await petsService.create(req.body);
    res.status(201).json({
      message: 'Pet created successfully',
      pet
    });
  });

  update = asyncHandler(async (req, res) => {
    const pet = await petsService.update(req.params.id, req.body);
    res.json({
      message: 'Pet updated successfully',
      pet
    });
  });

  delete = asyncHandler(async (req, res) => {
    const result = await petsService.delete(req.params.id);
    res.json(result);
  });

  getSpecies = asyncHandler(async (req, res) => {
    const species = await petsService.getSpecies();
    res.json({ species });
  });
}

module.exports = new PetsController();
