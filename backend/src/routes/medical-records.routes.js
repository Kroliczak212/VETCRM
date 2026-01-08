const express = require('express');
const router = express.Router();
const medicalRecordsController = require('../controllers/medical-records.controller');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   name: Medical Records
 *   description: Medical records and file management
 */

router.get('/', authenticate(['admin', 'doctor', 'receptionist']), medicalRecordsController.getAll);
router.get('/:id', authenticate(['admin', 'doctor', 'receptionist']), medicalRecordsController.getById);
router.post('/', authenticate(['doctor']), medicalRecordsController.create);
router.put('/:id', authenticate(['doctor']), medicalRecordsController.update);
router.delete('/:id', authenticate(['admin', 'doctor']), medicalRecordsController.delete);

// File upload - upload.single() returns array of middlewares [multer, validateAndSave]
router.post('/:id/files', authenticate(['doctor']), ...upload.single('file'), medicalRecordsController.addFile);
router.delete('/:id/files/:fileId', authenticate(['admin', 'doctor']), medicalRecordsController.deleteFile);
router.get('/files/:fileId/download', authenticate(), medicalRecordsController.downloadFile);

module.exports = router;
