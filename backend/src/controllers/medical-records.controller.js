const medicalRecordsService = require('../services/medical-records.service');
const asyncHandler = require('../utils/async-handler');

class MedicalRecordsController {
  getAll = asyncHandler(async (req, res) => {
    const records = await medicalRecordsService.getAll(req.query);
    res.json({ records });
  });

  getById = asyncHandler(async (req, res) => {
    const record = await medicalRecordsService.getById(req.params.id);
    res.json({ record });
  });

  create = asyncHandler(async (req, res) => {
    const record = await medicalRecordsService.create(req.body, req.user.id);
    res.status(201).json({ message: 'Medical record created successfully', medicalRecord: record });
  });

  update = asyncHandler(async (req, res) => {
    const record = await medicalRecordsService.update(req.params.id, req.body);
    res.json({ message: 'Medical record updated successfully', record });
  });

  delete = asyncHandler(async (req, res) => {
    const result = await medicalRecordsService.delete(req.params.id);
    res.json(result);
  });

  addFile = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = await medicalRecordsService.addFile(req.params.id, req.file);
    res.status(201).json({ message: 'File uploaded successfully', file });
  });

  deleteFile = asyncHandler(async (req, res) => {
    const result = await medicalRecordsService.deleteFile(req.params.fileId);
    res.json(result);
  });

  downloadFile = asyncHandler(async (req, res) => {
    const { file, filePath } = await medicalRecordsService.getFileForDownload(
      req.params.fileId,
      req.user
    );

    res.setHeader('Content-Type', file.file_type || 'application/octet-stream');

    // RFC 5987 encoding for filename (supports Polish/special characters)
    const encodedFilename = encodeURIComponent(file.file_name);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.file_name}"; filename*=UTF-8''${encodedFilename}`
    );

    res.sendFile(filePath);
  });
}

module.exports = new MedicalRecordsController();
