const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const clientsRoutes = require('./clients.routes');
const petsRoutes = require('./pets.routes');
const vaccinationsRoutes = require('./vaccinations.routes');
const servicesRoutes = require('./services.routes');
const appointmentsRoutes = require('./appointments.routes');
const schedulesRoutes = require('./schedules.routes');
const workingHoursRoutes = require('./working-hours.routes');
const medicalRecordsRoutes = require('./medical-records.routes');
const notificationsRoutes = require('./notifications.routes');
const penaltiesRoutes = require('./penalties.routes');
const dashboardRoutes = require('./dashboard.routes');
const settingsRoutes = require('./settings.routes');
const appointmentReasonsRoutes = require('./appointment-reasons.routes');
const vaccinationTypesRoutes = require('./vaccination-types.routes');

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/clients', clientsRoutes);
router.use('/pets', petsRoutes);
router.use('/vaccinations', vaccinationsRoutes);
router.use('/services', servicesRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/schedules', schedulesRoutes);
router.use('/working-hours', workingHoursRoutes);
router.use('/medical-records', medicalRecordsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/penalties', penaltiesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/appointment-reasons', appointmentReasonsRoutes);
router.use('/vaccination-types', vaccinationTypesRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
