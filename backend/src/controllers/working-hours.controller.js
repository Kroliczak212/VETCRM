const workingHoursService = require('../services/working-hours.service');
const asyncHandler = require('../utils/async-handler');

class WorkingHoursController {
  /**
   * Get all working hours (with filters)
   * Query params: doctorId, dayOfWeek, isActive
   */
  getAll = asyncHandler(async (req, res) => {
    const workingHours = await workingHoursService.getAll(req.query);
    res.json({ data: workingHours });
  });

  /**
   * Get working hours by ID
   */
  getById = asyncHandler(async (req, res) => {
    const workingHours = await workingHoursService.getById(req.params.id);
    res.json({ workingHours });
  });

  /**
   * Get working hours for specific doctor (organized by day)
   */
  getByDoctorId = asyncHandler(async (req, res) => {
    const workingHours = await workingHoursService.getByDoctorId(req.params.doctorId);
    res.json({ workingHours });
  });

  /**
   * Create new working hours entry
   * Admin can create for any doctor
   * Doctor can only create for themselves
   */
  create = asyncHandler(async (req, res) => {
    // If doctor role, ensure they're only creating for themselves
    if (req.user.role === 'doctor' && req.body.doctorUserId !== req.user.id) {
      return res.status(403).json({ error: 'Możesz zarządzać tylko własnymi godzinami pracy' });
    }

    const workingHours = await workingHoursService.create(req.body);
    res.status(201).json({
      message: 'Working hours created successfully',
      workingHours
    });
  });

  /**
   * Bulk create working hours (e.g., Mon-Fri 8:00-16:00)
   * Admin can create for any doctor
   * Doctor can only create for themselves
   */
  bulkCreate = asyncHandler(async (req, res) => {
    // If doctor role, ensure they're only creating for themselves
    if (req.user.role === 'doctor' && req.body.doctorUserId !== req.user.id) {
      return res.status(403).json({ error: 'Możesz zarządzać tylko własnymi godzinami pracy' });
    }

    const result = await workingHoursService.bulkCreate(req.body);
    res.status(201).json(result);
  });

  /**
   * Update working hours entry
   * Admin can update any working hours
   * Doctor can only update their own
   */
  update = asyncHandler(async (req, res) => {
    // If doctor role, verify they own this working hours entry
    if (req.user.role === 'doctor') {
      const existingWorkingHours = await workingHoursService.getById(req.params.id);
      if (existingWorkingHours.doctor_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Możesz zarządzać tylko własnymi godzinami pracy' });
      }
    }

    const workingHours = await workingHoursService.update(req.params.id, req.body);
    res.json({
      message: 'Working hours updated successfully',
      workingHours
    });
  });

  /**
   * Delete (soft) working hours entry
   * Admin can delete any working hours
   * Doctor can only delete their own
   */
  delete = asyncHandler(async (req, res) => {
    // If doctor role, verify they own this working hours entry
    if (req.user.role === 'doctor') {
      const existingWorkingHours = await workingHoursService.getById(req.params.id);
      if (existingWorkingHours.doctor_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Możesz zarządzać tylko własnymi godzinami pracy' });
      }
    }

    const result = await workingHoursService.delete(req.params.id);
    res.json(result);
  });

  /**
   * Hard delete working hours entry
   * Admin only - use with caution
   */
  hardDelete = asyncHandler(async (req, res) => {
    const result = await workingHoursService.hardDelete(req.params.id);
    res.json(result);
  });
}

module.exports = new WorkingHoursController();
