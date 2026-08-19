const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const { SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, EMAIL_FROM, FRONTEND_URL } = require('../config/dotenv');

const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT ? Number(SMTP_PORT) : 587,
  secure: Number(SMTP_PORT) === 465,
  auth: SMTP_USERNAME && SMTP_PASSWORD ? { user: SMTP_USERNAME, pass: SMTP_PASSWORD } : undefined,
});

const sendEmail = async (to, subject, text, html) => {
  await transport.sendMail({ from: EMAIL_FROM || SMTP_USERNAME, to, subject, text, html });
};

const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset your AdWise password';
  const resetPasswordUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  const text = `Hi,\n\nTo reset your AdWise password, click this link: ${resetPasswordUrl}\n\nIf you did not request a password reset, you can safely ignore this email.`;
  const html = `<p>Hi,</p><p>To reset your AdWise password, click the link below:</p><p><a href="${resetPasswordUrl}">${resetPasswordUrl}</a></p><p>If you did not request a password reset, you can safely ignore this email.</p>`;

  try {
    await sendEmail(to, subject, text, html);
  } catch (err) {
    logger.error(`Failed to send reset-password email to ${to}: ${err.message}`);
  }
};

module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
};
