const PDFDocument = require('pdfkit');
const path = require('path');
const { pool } = require('../config/database');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const { format } = require('date-fns');
const { pl } = require('date-fns/locale');

class PetDocumentationService {
  /**
   * Generate PDF documentation for a pet
   * @param {number} petId - Pet ID
   * @param {string|null} startDate - Start date (ISO 8601) or null for default (1 year ago)
   * @param {string|null} endDate - End date (ISO 8601) or null for default (today)
   * @param {object} user - User object from auth middleware
   * @returns {Promise<PDFDocument>} - PDF stream
   */
  async generatePetDocumentation(petId, startDate, endDate, user) {
    // 1. Validate access (only pet owner can generate PDF)
    await this._validateAccess(petId, user);

    // 2. Calculate date range
    const dateRange = this._calculateDateRange(startDate, endDate);

    // 3. Fetch pet data
    const pet = await this._fetchPetData(petId);

    // 4. Fetch appointments in date range
    const appointments = await this._fetchAppointments(petId, dateRange.start, dateRange.end);

    // 5. Fetch vaccinations in date range
    const vaccinations = await this._fetchVaccinations(petId, dateRange.start, dateRange.end);

    // 6. Generate PDF
    const pdf = this._generatePDF(pet, appointments, vaccinations, dateRange);

    return pdf;
  }

  /**
   * Validate that user is the owner of the pet
   * @private
   */
  async _validateAccess(petId, user) {
    const [pets] = await pool.query(
      'SELECT owner_user_id FROM pets WHERE id = ?',
      [petId]
    );

    if (pets.length === 0) {
      throw new NotFoundError('Pet');
    }

    if (pets[0].owner_user_id !== user.id) {
      throw new ForbiddenError('You can only generate documentation for your own pets');
    }
  }

  /**
   * Calculate date range for filtering
   * @private
   */
  _calculateDateRange(startDate, endDate) {
    const now = new Date();
    const end = endDate ? new Date(endDate) : now;

    // Default: 1 year ago
    const defaultStart = new Date(now);
    defaultStart.setFullYear(now.getFullYear() - 1);

    const start = startDate ? new Date(startDate) : defaultStart;

    // Validate dates
    if (start > end) {
      throw new ValidationError('Start date must be before end date');
    }

    // Allow small time difference (1 minute tolerance) to handle clock differences
    const oneMinuteFromNow = new Date(now.getTime() + 60000);
    if (end > oneMinuteFromNow) {
      throw new ValidationError('End date cannot be in the future');
    }

    return {
      start: start.toISOString().split('T')[0], // YYYY-MM-DD
      end: end.toISOString().split('T')[0]
    };
  }

  /**
   * Fetch pet data
   * @private
   */
  async _fetchPetData(petId) {
    const [pets] = await pool.query(
      `SELECT p.*,
              CONCAT(u.first_name, ' ', u.last_name) as owner_name,
              u.email as owner_email,
              u.phone as owner_phone
       FROM pets p
       JOIN users u ON p.owner_user_id = u.id
       WHERE p.id = ?`,
      [petId]
    );

    if (pets.length === 0) {
      throw new NotFoundError('Pet');
    }

    return pets[0];
  }

  /**
   * Fetch appointments in date range with medical records
   * @private
   */
  async _fetchAppointments(petId, startDate, endDate) {
    const [appointments] = await pool.query(
      `SELECT a.*,
              CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name,
              ar.name as reason_name,
              mr.id as medical_record_id,
              mr.diagnosis,
              mr.treatment,
              mr.prescription,
              mr.notes
       FROM appointments a
       JOIN users doc ON a.doctor_user_id = doc.id
       LEFT JOIN appointment_reasons ar ON a.reason_id = ar.id
       LEFT JOIN medical_records mr ON a.id = mr.appointment_id
       WHERE a.pet_id = ?
         AND DATE(a.scheduled_at) BETWEEN ? AND ?
         AND a.status = 'completed'
       ORDER BY a.scheduled_at DESC`,
      [petId, startDate, endDate]
    );

    // Get files for each medical record
    for (const appointment of appointments) {
      if (appointment.medical_record_id) {
        const [files] = await pool.query(
          'SELECT file_name, file_type, file_size, uploaded_at FROM medical_files WHERE medical_record_id = ? ORDER BY uploaded_at',
          [appointment.medical_record_id]
        );
        appointment.files = files;
      } else {
        appointment.files = [];
      }
    }

    return appointments;
  }

  /**
   * Fetch vaccinations in date range
   * @private
   */
  async _fetchVaccinations(petId, startDate, endDate) {
    const [vaccinations] = await pool.query(
      `SELECT v.*,
              vt.name as vaccination_type_name,
              vt.recommended_interval_months,
              CONCAT(doc.first_name, ' ', doc.last_name) as administered_by_name
       FROM vaccinations v
       LEFT JOIN vaccination_types vt ON v.vaccination_type_id = vt.id
       LEFT JOIN users doc ON v.administered_by_user_id = doc.id
       WHERE v.pet_id = ?
         AND v.vaccination_date BETWEEN ? AND ?
       ORDER BY v.vaccination_date DESC`,
      [petId, startDate, endDate]
    );

    return vaccinations;
  }

  /**
   * Generate PDF document
   * @private
   */
  _generatePDF(pet, appointments, vaccinations, dateRange) {
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: 'A4'
    });

    // Register custom fonts for UTF-8 support (Polish characters)
    const fontsPath = path.join(__dirname, '../assets/fonts');
    doc.registerFont('Roboto', path.join(fontsPath, 'DejaVuSans.ttf'));
    doc.registerFont('Roboto-Bold', path.join(fontsPath, 'DejaVuSans-Bold.ttf'));
    doc.registerFont('Roboto-Italic', path.join(fontsPath, 'DejaVuSans-Oblique.ttf'));

    // Header
    this._addHeader(doc, pet, dateRange);

    // Pet Information Section
    this._addPetInfoSection(doc, pet);

    // Appointments Section
    this._addAppointmentsSection(doc, appointments, dateRange);

    // Vaccinations Section
    this._addVaccinationsSection(doc, vaccinations, dateRange);

    // Footer
    this._addFooter(doc);

    // Finalize PDF
    doc.end();

    return doc;
  }

  /**
   * Add header to PDF
   * @private
   */
  _addHeader(doc, pet, dateRange) {
    doc
      .fontSize(24)
      .font('Roboto-Bold')
      .text('DOKUMENTACJA MEDYCZNA', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Roboto')
      .text(`Wygenerowano: ${this._formatDateTime(new Date())}`, { align: 'center' })
      .text(`Okres: ${this._formatDate(dateRange.start)} - ${this._formatDate(dateRange.end)}`, { align: 'center' })
      .moveDown(1.5);

    // Line separator
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(1);
  }

  /**
   * Add pet information section
   * @private
   */
  _addPetInfoSection(doc, pet) {
    doc
      .fontSize(16)
      .font('Roboto-Bold')
      .fillColor('#2563eb')
      .text('DANE PUPILA', { underline: true })
      .fillColor('#000000')
      .moveDown(0.5);

    const age = this._calculateAge(pet.date_of_birth);

    const petInfo = [
      { label: 'Imię:', value: pet.name || '-' },
      { label: 'Gatunek:', value: pet.species || '-' },
      { label: 'Rasa:', value: pet.breed || '-' },
      { label: 'Płeć:', value: this._formatSex(pet.sex) },
      { label: 'Wiek:', value: age },
      { label: 'Data urodzenia:', value: pet.date_of_birth ? this._formatDate(pet.date_of_birth) : '-' },
      { label: 'Waga:', value: pet.weight ? `${pet.weight} kg` : '-' },
      { label: 'Nr microchip:', value: pet.microchip_number || '-' }
    ];

    doc.fontSize(11).font('Roboto');

    petInfo.forEach(info => {
      doc
        .font('Roboto-Bold')
        .text(info.label, 70, doc.y, { continued: true, width: 150 })
        .font('Roboto')
        .text(info.value, { width: 350 })
        .moveDown(0.3);
    });

    if (pet.notes) {
      doc.moveDown(0.5);
      doc
        .font('Roboto-Bold')
        .text('Notatki:', 70)
        .font('Roboto')
        .text(this._escapeText(pet.notes), 70, doc.y, { width: 480 })
        .moveDown(0.5);
    }

    doc.moveDown(1);
  }

  /**
   * Add appointments section
   * @private
   */
  _addAppointmentsSection(doc, appointments, dateRange) {
    // Add new page if needed
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(16)
      .font('Roboto-Bold')
      .fillColor('#2563eb')
      .text('HISTORIA WIZYT', { underline: true })
      .fillColor('#000000')
      .moveDown(0.5);

    if (appointments.length === 0) {
      doc
        .fontSize(11)
        .font('Roboto-Italic')
        .fillColor('#666666')
        .text(`Brak wizyt w okresie ${this._formatDate(dateRange.start)} - ${this._formatDate(dateRange.end)}`)
        .fillColor('#000000')
        .moveDown(1.5);
    } else {
      doc
        .fontSize(10)
        .font('Roboto')
        .text(`Znaleziono wizyt: ${appointments.length}`)
        .moveDown(0.8);

      appointments.forEach((apt, index) => {
        // Add new page if needed
        if (doc.y > 650) {
          doc.addPage();
        }

        // Appointment header
        doc
          .fontSize(12)
          .font('Roboto-Bold')
          .text(`[${index + 1}] ${this._formatDateTime(apt.scheduled_at)}`, 70)
          .fontSize(10)
          .font('Roboto')
          .text(`Lekarz: ${apt.doctor_name}`, 90)
          .text(`Powód: ${apt.reason_name || apt.reason || '-'}`, 90)
          .moveDown(0.5);

        // Medical record details
        if (apt.medical_record_id) {
          if (apt.diagnosis) {
            doc
              .font('Roboto-Bold')
              .text('Rozpoznanie:', 90, doc.y, { continued: true })
              .font('Roboto')
              .text(` ${this._escapeText(apt.diagnosis)}`, { width: 420 })
              .moveDown(0.3);
          }

          if (apt.treatment) {
            doc
              .font('Roboto-Bold')
              .text('Leczenie:', 90, doc.y, { continued: true })
              .font('Roboto')
              .text(` ${this._escapeText(apt.treatment)}`, { width: 420 })
              .moveDown(0.3);
          }

          if (apt.prescription) {
            doc
              .font('Roboto-Bold')
              .text('Recepta:', 90, doc.y, { continued: true })
              .font('Roboto')
              .text(` ${this._escapeText(apt.prescription)}`, { width: 420 })
              .moveDown(0.3);
          }

          if (apt.notes) {
            doc
              .font('Roboto-Bold')
              .text('Notatki:', 90, doc.y, { continued: true })
              .font('Roboto')
              .text(` ${this._escapeText(apt.notes)}`, { width: 420 })
              .moveDown(0.3);
          }

          // Files
          if (apt.files && apt.files.length > 0) {
            doc
              .font('Roboto-Bold')
              .text('Załączniki:', 90)
              .font('Roboto');

            apt.files.forEach(file => {
              doc.text(`  • ${file.file_name} (${this._formatFileSize(file.file_size)})`, 100);
            });
            doc.moveDown(0.3);
          }
        } else {
          doc
            .font('Roboto-Italic')
            .fillColor('#666666')
            .text('Brak dokumentacji medycznej dla tej wizyty', 90)
            .fillColor('#000000')
            .moveDown(0.3);
        }

        // Separator
        doc
          .strokeColor('#eeeeee')
          .lineWidth(0.5)
          .moveTo(70, doc.y + 5)
          .lineTo(540, doc.y + 5)
          .stroke()
          .moveDown(1);
      });
    }

    doc.moveDown(0.5);
  }

  /**
   * Add vaccinations section
   * @private
   */
  _addVaccinationsSection(doc, vaccinations, dateRange) {
    // Add new page if needed
    if (doc.y > 650) {
      doc.addPage();
    }

    doc
      .fontSize(16)
      .font('Roboto-Bold')
      .fillColor('#2563eb')
      .text('HISTORIA SZCZEPIEŃ', { underline: true })
      .fillColor('#000000')
      .moveDown(0.5);

    if (vaccinations.length === 0) {
      doc
        .fontSize(11)
        .font('Roboto-Italic')
        .fillColor('#666666')
        .text(`Brak szczepień w okresie ${this._formatDate(dateRange.start)} - ${this._formatDate(dateRange.end)}`)
        .fillColor('#000000')
        .moveDown(1.5);
    } else {
      doc
        .fontSize(10)
        .font('Roboto')
        .text(`Znaleziono szczepień: ${vaccinations.length}`)
        .moveDown(0.8);

      vaccinations.forEach((vac, index) => {
        // Add new page if needed
        if (doc.y > 700) {
          doc.addPage();
        }

        doc
          .fontSize(11)
          .font('Roboto-Bold')
          .text(`• ${vac.vaccination_type_name || vac.vaccine_name || 'Szczepienie'}`, 70)
          .fontSize(10)
          .font('Roboto')
          .text(`Data: ${this._formatDate(vac.vaccination_date)}`, 90)
          .text(`Następne szczepienie: ${this._formatDate(vac.next_due_date)}`, 90);

        if (vac.batch_number) {
          doc.text(`Nr partii: ${vac.batch_number}`, 90);
        }

        if (vac.administered_by_name) {
          doc.text(`Podane przez: ${vac.administered_by_name}`, 90);
        }

        if (vac.recommended_interval_months) {
          doc.text(`Zalecany interwał: ${vac.recommended_interval_months} miesięcy`, 90);
        }

        if (vac.notes) {
          doc
            .font('Roboto-Bold')
            .text('Notatki:', 90, doc.y, { continued: true })
            .font('Roboto')
            .text(` ${this._escapeText(vac.notes)}`, { width: 420 });
        }

        doc.moveDown(0.8);
      });
    }
  }

  /**
   * Add footer to PDF
   * @private
   */
  _addFooter(doc) {
    const range = doc.bufferedPageRange();
    const pageCount = range.count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(range.start + i);

      doc
        .fontSize(8)
        .font('Roboto')
        .fillColor('#666666')
        .text(
          `Strona ${i + 1} z ${pageCount}`,
          50,
          doc.page.height - 50,
          { align: 'center', width: doc.page.width - 100 }
        );
    }
  }

  /**
   * Helper: Format date to Polish locale
   * @private
   */
  _formatDate(dateString) {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return format(date, 'dd.MM.yyyy', { locale: pl });
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Helper: Format datetime to Polish locale
   * @private
   */
  _formatDateTime(dateString) {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return format(date, 'dd.MM.yyyy HH:mm', { locale: pl });
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Helper: Format sex
   * @private
   */
  _formatSex(sex) {
    const sexMap = {
      'male': 'Samiec',
      'female': 'Samica',
      'unknown': 'Nieznana'
    };
    return sexMap[sex] || '-';
  }

  /**
   * Helper: Calculate age from birth date
   * @private
   */
  _calculateAge(birthDate) {
    if (!birthDate) return 'Nieznany wiek';

    const birth = new Date(birthDate);
    const now = new Date();
    const ageYears = now.getFullYear() - birth.getFullYear();
    const ageMonths = now.getMonth() - birth.getMonth();

    if (ageYears === 0) {
      return `${ageMonths} ${ageMonths === 1 ? 'miesiąc' : 'miesięcy'}`;
    } else if (ageYears === 1) {
      return '1 rok';
    } else if (ageYears < 5) {
      return `${ageYears} lata`;
    } else {
      return `${ageYears} lat`;
    }
  }

  /**
   * Helper: Format file size
   * @private
   */
  _formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Helper: Escape text to prevent issues in PDF
   * @private
   */
  _escapeText(text) {
    if (!text) return '';
    // Remove null bytes and control characters
    return String(text).replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  }
}

module.exports = new PetDocumentationService();
