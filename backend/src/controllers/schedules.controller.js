const schedulesService = require('../services/schedules.service');
const asyncHandler = require('../utils/async-handler');

class SchedulesController {
  getAll = asyncHandler(async (req, res) => {
    const schedules = await schedulesService.getAll(req.query);
    res.json({ schedules });
  });

  getById = asyncHandler(async (req, res) => {
    const schedule = await schedulesService.getById(req.params.id);
    res.json({ schedule });
  });

  create = asyncHandler(async (req, res) => {
    const schedule = await schedulesService.create(req.body, req.user);
    res.status(201).json({ message: 'Schedule created successfully', schedule });
  });

  update = asyncHandler(async (req, res) => {
    const schedule = await schedulesService.update(req.params.id, req.body);
    res.json({ message: 'Schedule updated successfully', schedule });
  });

  delete = asyncHandler(async (req, res) => {
    const result = await schedulesService.delete(req.params.id);
    res.json(result);
  });

  approve = asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    const schedule = await schedulesService.approve(req.params.id, status, req.user.id, notes);
    res.json({ message: `Schedule ${status}`, schedule });
  });

  getCalendar = asyncHandler(async (req, res) => {
    const { doctorId, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required',
        code: 'MISSING_PARAMETERS'
      });
    }

    // Doctors can only view their own calendar, admins can view any
    const targetDoctorId = doctorId ? parseInt(doctorId) : req.user.id;

    if (req.user.role !== 'admin' && targetDoctorId !== req.user.id) {
      return res.status(403).json({
        error: 'You can only view your own calendar',
        code: 'FORBIDDEN'
      });
    }

    const calendar = await schedulesService.getCalendar(targetDoctorId, startDate, endDate);
    res.json({ calendar });
  });
}

module.exports = new SchedulesController();
