const usersService = require('../services/users.service');
const asyncHandler = require('../utils/async-handler');

class UsersController {
  /**
   * @route   GET /api/users
   * @desc    Get all users (with pagination and filters)
   * @access  Private (admin only)
   */
  getAll = asyncHandler(async (req, res) => {
    const result = await usersService.getAll(req.query);
    res.json(result);
  });

  /**
   * @route   GET /api/users/:id
   * @desc    Get user by ID
   * @access  Private (admin only)
   */
  getById = asyncHandler(async (req, res) => {
    const user = await usersService.getById(req.params.id);
    res.json({ user });
  });

  /**
   * @route   POST /api/users
   * @desc    Create new staff user (admin, receptionist, doctor)
   * @access  Private (admin only)
   */
  create = asyncHandler(async (req, res) => {
    const user = await usersService.create(req.body);
    res.status(201).json({
      message: 'User created successfully',
      user
    });
  });

  /**
   * @route   PUT /api/users/:id
   * @desc    Update user
   * @access  Private (admin only)
   */
  update = asyncHandler(async (req, res) => {
    const user = await usersService.update(req.params.id, req.body);
    res.json({
      message: 'User updated successfully',
      user
    });
  });

  /**
   * @route   DELETE /api/users/:id
   * @desc    Delete user
   * @access  Private (admin only)
   */
  delete = asyncHandler(async (req, res) => {
    const result = await usersService.delete(req.params.id);
    res.json(result);
  });

  /**
   * @route   PATCH /api/users/:id/is-active
   * @desc    Update user's active status (activate/deactivate)
   * @access  Private (admin only)
   */
  updateIsActive = asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    const user = await usersService.updateIsActive(req.params.id, isActive);
    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  });

  /**
   * @route   GET /api/users/doctors
   * @desc    Get all active doctors (available for all authenticated users)
   * @access  Private (all authenticated)
   */
  getDoctors = asyncHandler(async (req, res) => {
    const doctors = await usersService.getDoctors();
    res.json({ users: doctors });
  });

  /**
   * @route   GET /api/users/roles
   * @desc    Get all roles
   * @access  Private (admin only)
   */
  getRoles = asyncHandler(async (req, res) => {
    const roles = await usersService.getRoles();
    res.json({ roles });
  });
}

module.exports = new UsersController();
