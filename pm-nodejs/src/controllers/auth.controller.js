const httpStatus = require('../utils/httpStatus');
const catchAsync = require('../utils/catchAsync');
const config = require('../config/config');
const logger = require('../config/logger');
const { authService, userService, tokenService, emailService } = require('../services');

const buildFrontendProfileRedirectUrl = (tokens) => {
  const redirectUrl = new URL(config.frontend.profilePath, config.frontend.url);
  const hashParams = new URLSearchParams({
    accessToken: tokens.access.token,
    refreshToken: tokens.refresh.token,
    accessExpires: tokens.access.expires.toISOString(),
    refreshExpires: tokens.refresh.expires.toISOString(),
    verified: 'true',
  });

  redirectUrl.hash = hashParams.toString();
  return redirectUrl.toString();
};

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);

  try {
    await emailService.sendVerificationEmail(user.email, verifyEmailToken);
  } catch (error) {
    logger.warn(`Failed to send verification email to ${user.email}: ${error.message}`);
  }

  res.status(httpStatus.CREATED).send({ user, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmailAndRedirect = catchAsync(async (req, res) => {
  const user = await authService.verifyEmail(req.query.token);
  const tokens = await tokenService.generateAuthTokens(user);
  res.redirect(httpStatus.FOUND, buildFrontendProfileRedirectUrl(tokens));
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  verifyEmailAndRedirect,
};
