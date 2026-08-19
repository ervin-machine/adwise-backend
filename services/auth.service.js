const { status } = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const emailService = require('./email.service');
const Token = require('../models/token.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models');
const { GOOGLE_CLIENT_ID } = require("../config/dotenv")
const client = new OAuth2Client();

const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);

  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(status.UNAUTHORIZED, "Incorrect email or password");
  }

  if (user.isOAuthUser) {
    throw new ApiError(status.UNAUTHORIZED, "Please log in using Google or your OAuth provider.");
  }

  return user;
};

const loginWithGoogleAuth = async (credential) => {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { email, given_name, family_name } = payload;

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      name: `${given_name} ${family_name}`,
      role: "user",
      isOAuthUser: true,
      connectedAds: false
    });

  } else if (!user.isOAuthUser) {
    throw new ApiError(status.BAD_REQUEST, "Email already registered with password authentication. Please log in with your email and password.");
  }

  return user;
};

const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  
  if (!refreshTokenDoc) {
    throw new ApiError(status.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.deleteOne();
};

const refreshAuth = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(status.UNAUTHORIZED, "Refresh token not found");
  }

  const tokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH });

  if (!tokenDoc) {
      throw new ApiError(status.UNAUTHORIZED, "Refresh token not found");
  }

  if (!tokenService.isTokenExpired(tokenDoc)) {
      const user = await userService.getUserById(tokenDoc.user);
      const { access } = await tokenService.generateAccessToken(user);
      return { access, refresh: { token: refreshToken, expires: tokenDoc.expires } };
  }

  await tokenDoc.deleteOne();
  const user = await userService.getUserById(tokenDoc.user);
  const newTokens = await tokenService.generateAuthTokens(user);
  return newTokens;
};

const forgotPassword = async (email) => {
  const user = await userService.getUserByEmail(email);

  // Don't reveal whether the account exists - always resolve the same way.
  if (!user || user.isOAuthUser) {
    return;
  }

  const resetPasswordToken = await tokenService.generateResetPasswordToken(user);
  await emailService.sendResetPasswordEmail(user.email, resetPasswordToken);
};

const resetPassword = async (resetPasswordToken, newPassword) => {
  let tokenDoc;
  try {
    tokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
  } catch (err) {
    throw new ApiError(status.UNAUTHORIZED, 'Password reset failed: invalid or expired token');
  }

  const user = await userService.getUserById(tokenDoc.user);
  if (!user) {
    throw new ApiError(status.UNAUTHORIZED, 'Password reset failed');
  }

  user.password = newPassword;
  await user.save();

  await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
};

module.exports = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  loginWithGoogleAuth,
  forgotPassword,
  resetPassword,
};