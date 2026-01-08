const authService = require('../services/auth.service');
const asyncHandler = require('../utils/async-handler');

class AuthController {
  /**
   * @route   POST /api/auth/register
   * @desc    Register a new user
   * @access  Public
   */
  register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);

    res.status(201).json({
      message: 'User registered successfully',
      ...result
    });
  });

  /**
   * @route   POST /api/auth/login
   * @desc    Login user
   * @access  Public
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.json({
      message: 'Login successful',
      ...result
    });
  });

  /**
   * @route   GET /api/auth/profile
   * @desc    Get current user profile
   * @access  Private
   */
  getProfile = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    res.json({ user });
  });

  /**
   * @route   POST /api/auth/change-password
   * @desc    Change user password (first-time or regular update)
   * @access  Private (authenticated users only)
   */
  changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    const result = await authService.changePassword(userId, oldPassword, newPassword);

    res.json(result);
  });

  /**
   * @route   POST /api/auth/logout
   * @desc    Logout user (revoke token)
   * @access  Private (authenticated users only)
   */
  logout = asyncHandler(async (req, res) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];

    const result = await authService.logout(token);

    res.json(result);
  });

  /**
   * @route   POST /api/auth/forgot-password
   * @desc    Request password reset (generates token and sends email)
   * @access  Public
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    await authService.requestPasswordReset(email, ipAddress);

    // Always return success (security - don't reveal if email exists)
    res.json({
      message: 'If the email exists in our system, a password reset link has been sent'
    });
  });

  /**
   * @route   POST /api/auth/reset-password
   * @desc    Reset password using token from email
   * @access  Public
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const result = await authService.resetPassword(token, newPassword);

    res.json(result);
  });

  /**
   * @route   GET /api/auth/verify-reset-token/:token
   * @desc    Verify if reset token is valid (for frontend validation)
   * @access  Public
   */
  verifyResetToken = asyncHandler(async (req, res) => {
    const { token } = req.params;

    const isValid = await authService.verifyResetToken(token);

    res.json({ valid: isValid });
  });

  /**
   * @route   PUT /api/auth/profile
   * @desc    Update client profile (self-service)
   * @access  Private (client only)
   */
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const updatedUser = await authService.updateProfile(userId, req.body);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  });
}

module.exports = new AuthController();
