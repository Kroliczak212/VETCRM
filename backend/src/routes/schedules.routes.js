const express = require('express');
const router = express.Router();
const schedulesController = require('../controllers/schedules.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Schedules
 *   description: Doctor availability schedules
 */

router.get('/', authenticate(), schedulesController.getAll);
router.get('/calendar', authenticate(['admin', 'doctor']), schedulesController.getCalendar);
router.get('/:id', authenticate(), schedulesController.getById);
router.post('/', authenticate(['admin', 'doctor']), schedulesController.create);
router.put('/:id', authenticate(['admin', 'doctor']), schedulesController.update);
router.patch('/:id/approve', authenticate(['admin']), schedulesController.approve);
router.delete('/:id', authenticate(['admin']), schedulesController.delete);

module.exports = router;
