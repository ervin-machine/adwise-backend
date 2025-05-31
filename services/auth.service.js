const { status } = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
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
  const tokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH });

  if (!tokenDoc) {
      throw new ApiError(status.UNAUTHORIZED, "Refresh token not found");
  }

  if (!tokenService.isTokenExpired(tokenDoc)) {
      const user = await userService.getUserById(tokenDoc.user);
      const accessToken = tokenService.generateAccessToken(user);
      return { access: accessToken, refresh: refreshToken };
  }

  await tokenDoc.remove();
  const user = await userService.getUserById(tokenDoc.user);
  const newTokens = await tokenService.generateAuthTokens(user);
  return newTokens;
};

module.exports = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  loginWithGoogleAuth
};