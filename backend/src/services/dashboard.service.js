const { pool } = require('../config/database');

class DashboardService {
  /**
   * Get statistics for Admin Dashboard
   * @returns {Object} Admin statistics
   */
  async getAdminStatistics() {
    const connection = await pool.getConnection();
    try {
      // Total staff count (excluding clients - role_id != 4)
      const [staffCount] = await connection.query(
        'SELECT COUNT(*) as total FROM users WHERE role_id != 4'
      );

      const [doctorsCount] = await connection.query(
        'SELECT COUNT(*) as total FROM users WHERE role_id = 3'
      );

      const [appointmentsCount] = await connection.query(
        'SELECT COUNT(*) as total FROM appointments'
      );

      const [appointmentsByStatus] = await connection.query(`
        SELECT
          status,
          COUNT(*) as count
        FROM appointments
        GROUP BY status
      `);

      const [recentActivity] = await connection.query(`
        SELECT
          a.id,
          a.status,
          a.scheduled_at,
          a.created_at,
          CONCAT(u.first_name, ' ', u.last_name) as client_name,
          p.name as pet_name,
          CONCAT(d.first_name, ' ', d.last_name) as doctor_name
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        JOIN users u ON p.owner_user_id = u.id
        JOIN users d ON a.doctor_user_id = d.id
        ORDER BY a.created_at DESC
        LIMIT 10
      `);

      return {
        totalStaff: staffCount[0].total,
        activeDoctors: doctorsCount[0].total,
        totalAppointments: appointmentsCount[0].total,
        appointmentsByStatus,
        recentActivity,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get statistics for Receptionist Dashboard
   * @returns {Object} Receptionist statistics
   */
  async getReceptionistStatistics() {
    const connection = await pool.getConnection();
    try {
      const today = new Date().toISOString().split('T')[0];

      const [todayAppointments] = await connection.query(
        'SELECT COUNT(*) as total FROM appointments WHERE DATE(scheduled_at) = ?',
        [today]
      );

      const [pendingAppointments] = await connection.query(`
        SELECT COUNT(*) as total
        FROM appointments
        WHERE DATE(scheduled_at) = ?
          AND status IN ('proposed', 'confirmed')
      `, [today]);

      const [newClients] = await connection.query(`
        SELECT COUNT(*) as total
        FROM users
        WHERE role_id = 4
          AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
      `);

      const [appointmentsList] = await connection.query(`
        SELECT
          a.id,
          a.scheduled_at,
          a.status,
          a.duration_minutes,
          a.reason,
          p.name as pet_name,
          p.species,
          CONCAT(client.first_name, ' ', client.last_name) as client_name,
          client.phone as client_phone,
          CONCAT(doctor.first_name, ' ', doctor.last_name) as doctor_name
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        JOIN users client ON p.owner_user_id = client.id
        JOIN users doctor ON a.doctor_user_id = doctor.id
        WHERE DATE(a.scheduled_at) = ?
        ORDER BY a.scheduled_at ASC
      `, [today]);

      return {
        todayAppointments: todayAppointments[0].total,
        pendingAppointments: pendingAppointments[0].total,
        newClientsThisMonth: newClients[0].total,
        appointmentsList,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get statistics for Doctor Dashboard
   * @param {number} doctorId - Doctor user ID
   * @returns {Object} Doctor statistics
   */
  async getDoctorStatistics(doctorId) {
    const connection = await pool.getConnection();
    try {
      const today = new Date().toISOString().split('T')[0];

      const [todayAppointments] = await connection.query(
        'SELECT COUNT(*) as total FROM appointments WHERE doctor_user_id = ? AND DATE(scheduled_at) = ?',
        [doctorId, today]
      );

      const [completedToday] = await connection.query(`
        SELECT COUNT(*) as total
        FROM appointments
        WHERE doctor_user_id = ?
          AND DATE(scheduled_at) = ?
          AND status = 'completed'
      `, [doctorId, today]);

      const [upcomingToday] = await connection.query(`
        SELECT COUNT(*) as total
        FROM appointments
        WHERE doctor_user_id = ?
          AND DATE(scheduled_at) = ?
          AND status IN ('proposed', 'confirmed', 'in_progress')
      `, [doctorId, today]);

      const [appointmentsList] = await connection.query(`
        SELECT
          a.id,
          a.scheduled_at,
          a.status,
          a.duration_minutes,
          a.reason,
          a.location,
          p.id as pet_id,
          p.name as pet_name,
          p.species,
          p.breed,
          CONCAT(client.first_name, ' ', client.last_name) as client_name,
          client.phone as client_phone,
          client.email as client_email
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        JOIN users client ON p.owner_user_id = client.id
        WHERE a.doctor_user_id = ? AND DATE(a.scheduled_at) = ?
        ORDER BY a.scheduled_at ASC
      `, [doctorId, today]);

      const [totalPatients] = await connection.query(`
        SELECT COUNT(DISTINCT pet_id) as total
        FROM appointments
        WHERE doctor_user_id = ?
      `, [doctorId]);

      const [weekStats] = await connection.query(`
        SELECT
          COUNT(*) as total_appointments,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments
        FROM appointments
        WHERE doctor_user_id = ?
          AND scheduled_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
          AND scheduled_at < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
      `, [doctorId]);

      return {
        todayAppointments: todayAppointments[0].total,
        completedToday: completedToday[0].total,
        upcomingToday: upcomingToday[0].total,
        totalPatients: totalPatients[0].total,
        weekTotalAppointments: weekStats[0].total_appointments || 0,
        weekCompletedAppointments: weekStats[0].completed_appointments || 0,
        appointmentsList,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get statistics for Client Dashboard
   * @param {number} clientId - Client user ID
   * @returns {Object} Client statistics
   */
  async getClientStatistics(clientId) {
    const connection = await pool.getConnection();
    try {
      const [petsCount] = await connection.query(
        'SELECT COUNT(*) as total FROM pets WHERE owner_user_id = ?',
        [clientId]
      );

      const [upcomingAppointments] = await connection.query(`
        SELECT COUNT(*) as total
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        WHERE p.owner_user_id = ?
          AND a.scheduled_at >= NOW()
          AND a.status NOT IN ('cancelled', 'cancelled_late', 'completed')
      `, [clientId]);

      const [totalAppointments] = await connection.query(`
        SELECT COUNT(*) as total
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        WHERE p.owner_user_id = ?
      `, [clientId]);

      return {
        totalPets: petsCount[0].total,
        upcomingAppointments: upcomingAppointments[0].total,
        totalAppointments: totalAppointments[0].total,
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = new DashboardService();
