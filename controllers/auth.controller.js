const { status } = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService } = require('../services');
const { tokenTypes } = require('../config/tokens');
const { Token } = require('../models');
const { NODE_ENV } = require("../config/dotenv")

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);

  res.cookie("refreshToken", tokens.refresh.token, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "Strict",
  });

  res.status(status.CREATED).send({ user, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);

  res.cookie("refreshToken", tokens.refresh.token, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "Strict",
  });

  res.send({ user, tokens });
});

const googleLogin = catchAsync(async (req, res) => {
    const { credential} = req.body;
    const user = await authService.loginWithGoogleAuth(credential);
    const tokens = await tokenService.generateAuthTokens(user);

    res.cookie("refreshToken", tokens.refresh.token, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "Strict",
    });
    res.send({ user, tokens });
})

const logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
      await Token.findOneAndDelete({ token: refreshToken, type: tokenTypes.REFRESH });
  }

  res.clearCookie("refreshToken");
  res.status(204).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  const tokens = await authService.refreshAuth(refreshToken);
  res.send({ ...tokens });
});

const getMe = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken; // Get refresh token from cookie

  const tokenDoc = await tokenService.getTokenDoc(refreshToken)

  const isExpired = tokenService.isTokenExpired(tokenDoc);

  if (!isExpired) {
      const user = await userService.getUserById(tokenDoc.user);
      const accessToken = await tokenService.generateAccessToken(user);
      return res.json({ user, ...accessToken });
  }

  await tokenService.deleteDoc(refreshToken)

  const user = await userService.getUserById(tokenDoc.user);
  const newTokens = await tokenService.generateAuthTokens(user);

  res.cookie("refreshToken", newTokens.refresh, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "Strict",
  });

  res.json({ user, accessToken: newTokens.access.token });
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});



module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  getMe,
  googleLogin,
  updateUser
};