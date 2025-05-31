const { status } = require('http-status')
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { JWT_SECRET, JWT_ACCESS_EXPIRATION_MINUTES, JWT_REFRESH_EXPIRATION_DAYS } = require('../config/dotenv');
const { Token } = require('../models');
const { tokenTypes } = require('../config/tokens');
const { userService } = require("../services")
const ApiError = require('../utils/ApiError');

const generateToken = (userId, expires, type, secret = JWT_SECRET) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

const verifyToken = async (token, type) => {
  const payload = jwt.verify(token, JWT_SECRET);
  const tokenDoc = await Token.findOne({ token, type, user: payload.sub, blacklisted: false });
  if (!tokenDoc) {
    throw new Error('Token not found');
  }
  return tokenDoc;
};

const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(JWT_ACCESS_EXPIRATION_MINUTES, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = moment().add(JWT_REFRESH_EXPIRATION_DAYS, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

const generateAccessToken = async (user) => {
  const accessTokenExpires = moment().add(JWT_ACCESS_EXPIRATION_MINUTES, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
  };
};

const isTokenExpired = (tokenDoc) => {
  const decoded = jwt.decode(tokenDoc.token);
  if (!decoded || !decoded.exp) return true;

  const now = Math.floor(Date.now() / 1000); // Current timestamp
  return decoded.exp < now;
};

const getTokenDoc = async (refreshToken) => {

   const tokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH });

   if (!tokenDoc) {
    throw new ApiError(status.UNAUTHORIZED, "Refresh token not found");
  }

  return tokenDoc
}

const deleteDoc = async (refreshToken) => {
  const tokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH });

  await tokenDoc.deleteOne();
}

module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  isTokenExpired,
  generateAccessToken,
  getTokenDoc,
  deleteDoc
};