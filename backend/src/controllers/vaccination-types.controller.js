const vaccinationTypesService = require('../services/vaccination-types.service');
const asyncHandler = require('../utils/async-handler');

/**
 * Get all vaccination types
 * @route GET /api/vaccination-types
 * @access Public (all authenticated users)
 */
exports.getAll = asyncHandler(async (req, res) => {
  const result = await vaccinationTypesService.getAll(req.query);
  res.json(result);
});

/**
 * Get vaccination type by ID
 * @route GET /api/vaccination-types/:id
 * @access Public (all authenticated users)
 */
exports.getById = asyncHandler(async (req, res) => {
  const type = await vaccinationTypesService.getById(parseInt(req.params.id));
  res.json({ type });
});

/**
 * Create new vaccination type
 * @route POST /api/vaccination-types
 * @access Admin only
 */
exports.create = asyncHandler(async (req, res) => {
  const type = await vaccinationTypesService.create(req.body);
  res.status(201).json({ type });
});

/**
 * Update vaccination type
 * @route PUT /api/vaccination-types/:id
 * @access Admin only
 */
exports.update = asyncHandler(async (req, res) => {
  const type = await vaccinationTypesService.update(parseInt(req.params.id), req.body);
  res.json({ type });
});

/**
 * Delete vaccination type (soft delete)
 * @route DELETE /api/vaccination-types/:id
 * @access Admin only
 */
exports.delete = asyncHandler(async (req, res) => {
  const result = await vaccinationTypesService.delete(parseInt(req.params.id));
  res.json(result);
});
