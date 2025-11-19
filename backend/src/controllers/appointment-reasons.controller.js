const appointmentReasonsService = require('../services/appointment-reasons.service');
const asyncHandler = require('../utils/async-handler');

/**
 * Get all appointment reasons
 * @route GET /api/appointment-reasons
 * @access Public (all authenticated users)
 */
exports.getAll = asyncHandler(async (req, res) => {
  const result = await appointmentReasonsService.getAll(req.query);
  res.json(result);
});

/**
 * Get appointment reason by ID
 * @route GET /api/appointment-reasons/:id
 * @access Public (all authenticated users)
 */
exports.getById = asyncHandler(async (req, res) => {
  const reason = await appointmentReasonsService.getById(parseInt(req.params.id));
  res.json({ reason });
});

/**
 * Create new appointment reason
 * @route POST /api/appointment-reasons
 * @access Admin only
 */
exports.create = asyncHandler(async (req, res) => {
  const reason = await appointmentReasonsService.create(req.body);
  res.status(201).json({ reason });
});

/**
 * Update appointment reason
 * @route PUT /api/appointment-reasons/:id
 * @access Admin only
 */
exports.update = asyncHandler(async (req, res) => {
  const reason = await appointmentReasonsService.update(parseInt(req.params.id), req.body);
  res.json({ reason });
});

/**
 * Delete appointment reason (soft delete)
 * @route DELETE /api/appointment-reasons/:id
 * @access Admin only
 */
exports.delete = asyncHandler(async (req, res) => {
  const result = await appointmentReasonsService.delete(parseInt(req.params.id));
  res.json(result);
});
