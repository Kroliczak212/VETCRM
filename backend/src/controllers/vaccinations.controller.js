const vaccinationsService = require('../services/vaccinations.service');
const asyncHandler = require('../utils/async-handler');

class VaccinationsController {
  getAll = asyncHandler(async (req, res) => {
    const result = await vaccinationsService.getAll(req.query, req.user);
    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const vaccination = await vaccinationsService.getById(req.params.id, req.user);
    res.json({ vaccination });
  });

  create = asyncHandler(async (req, res) => {
    const vaccination = await vaccinationsService.create(req.body, req.user);
    res.status(201).json({
      message: 'Vaccination record created successfully',
      vaccination
    });
  });

  update = asyncHandler(async (req, res) => {
    const vaccination = await vaccinationsService.update(req.params.id, req.body, req.user);
    res.json({
      message: 'Vaccination record updated successfully',
      vaccination
    });
  });

  delete = asyncHandler(async (req, res) => {
    const result = await vaccinationsService.delete(req.params.id, req.user);
    res.json(result);
  });

  getUpcomingByPet = asyncHandler(async (req, res) => {
    const daysAhead = req.query.daysAhead || 90;
    const vaccinations = await vaccinationsService.getUpcomingByPet(req.params.petId, daysAhead);
    res.json({ vaccinations });
  });

  createProtocolBased = asyncHandler(async (req, res) => {
    const vaccination = await vaccinationsService.createProtocolBased(req.body, req.user);
    res.status(201).json({
      message: 'Protocol-based vaccination recorded successfully',
      vaccination
    });
  });

  createAdHoc = asyncHandler(async (req, res) => {
    const vaccination = await vaccinationsService.createAdHoc(req.body, req.user);
    res.status(201).json({
      message: 'Ad-hoc vaccination recorded successfully',
      vaccination
    });
  });

  getByType = asyncHandler(async (req, res) => {
    const isProtocolBased = req.query.isProtocolBased === 'true';
    const vaccinations = await vaccinationsService.getByType(req.params.petId, isProtocolBased);
    res.json({ vaccinations });
  });
}

module.exports = new VaccinationsController();
