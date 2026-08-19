const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    company: Joi.string().required(),
    phone: Joi.string(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

const logout = {
  cookies: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }).unknown(true),
};

const refreshTokens = {
  cookies: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }).unknown(true),
};

const getMe = {
  cookies: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }).unknown(true),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      email: Joi.string().email(),
      phone: Joi.string(),
      company: Joi.string(),
      password: Joi.string().custom(password),
    })
    .min(1),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    token: Joi.string().required(),
    password: Joi.string().required().custom(password),
  }),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  getMe,
  updateUser,
  forgotPassword,
  resetPassword,
};