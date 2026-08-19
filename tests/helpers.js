const jwt = require('jsonwebtoken');
const moment = require('moment');
const { JWT_SECRET } = require('../config/dotenv');
const { tokenTypes } = require('../config/tokens');
const { User } = require('../models');

let counter = 0;

const createUser = async (overrides = {}) => {
  counter += 1;
  return User.create({
    name: 'Test User',
    email: `user${Date.now()}${counter}@example.com`,
    company: 'Acme',
    phone: '+1234567890',
    password: 'password1',
    role: 'user',
    ...overrides,
  });
};

const generateAccessToken = (user) => {
  const expires = moment().add(30, 'minutes');
  return jwt.sign(
    { sub: user.id, iat: moment().unix(), exp: expires.unix(), type: tokenTypes.ACCESS },
    JWT_SECRET
  );
};

const authHeader = (user) => `Bearer ${generateAccessToken(user)}`;

module.exports = { createUser, generateAccessToken, authHeader };
