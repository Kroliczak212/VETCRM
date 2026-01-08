const petsService = require('../services/pets.service');
const petDocumentationService = require('../services/pet-documentation.service');
const asyncHandler = require('../utils/async-handler');
const { format } = require('date-fns');

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

  generateDocumentationPDF = asyncHandler(async (req, res) => {
    const petId = req.params.id;
    const { startDate, endDate } = req.query;

    const pdfStream = await petDocumentationService.generatePetDocumentation(
      petId,
      startDate || null,
      endDate || null,
      req.user
    );

    // Construct filename using pet name and current date
    const pet = await petsService.getById(petId);
    const petName = pet.name.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `dokumentacja_${petName}_${dateStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    pdfStream.pipe(res);
  });

  /**
   * Create pet by client (self-service)
   * Client automatically becomes the owner
   */
  createByClient = asyncHandler(async (req, res) => {
    const pet = await petsService.createByClient(req.body, req.user.id);
    res.status(201).json({
      message: 'Pet created successfully',
      pet
    });
  });

  /**
   * Update pet by client (self-service)
   * Client can only update their own pets
   */
  updateByClient = asyncHandler(async (req, res) => {
    const pet = await petsService.updateByClient(req.params.id, req.body, req.user.id);
    res.json({
      message: 'Pet updated successfully',
      pet
    });
  });
}

module.exports = new PetsController();
