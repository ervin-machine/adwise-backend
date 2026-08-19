// One-off setup helper - not part of the running app.
// Generates a Google Ads API refresh token via a local OAuth2 consent flow.
//
// Usage:
//   1. Make sure CLIENT_ID and CLIENT_SECRET are set in .env
//      (Cloud Console -> APIs & Services -> Credentials -> OAuth client ID,
//      type "Desktop app").
//   2. node scripts/generate-google-ads-refresh-token.js
//   3. Open the printed URL, sign in with the Google account that manages
//      your Google Ads manager account, and approve access.
//   4. The refresh token prints in this terminal - copy it into .env as
//      REFRESH_TOKEN.

require('dotenv').config();
const http = require('http');
const { URL } = require('url');
const { OAuth2Client } = require('google-auth-library');

const { CLIENT_ID, CLIENT_SECRET } = process.env;
const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set CLIENT_ID and CLIENT_SECRET in .env first (Google Cloud Console OAuth client).');
  process.exit(1);
}

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/adwords'],
});

console.log('\nOpen this URL, sign in with the account that manages your Google Ads account, and approve access:\n');
console.log(authUrl);
console.log('\nWaiting for you to complete the consent screen...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');
  if (!code) {
    res.end('No authorization code received - check the terminal and try again.');
    return;
  }

  res.end('Success! You can close this tab and return to the terminal.');
  server.close();

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    if (!tokens.refresh_token) {
      console.log('\nNo refresh token came back - this Google account may have already granted');
      console.log('this app access before. Revoke access at https://myaccount.google.com/permissions');
      console.log('and run this script again.\n');
      return;
    }
    console.log('\nRefresh token (put this in .env as REFRESH_TOKEN):\n');
    console.log(tokens.refresh_token);
    console.log('');
  } catch (err) {
    console.error('\nFailed to exchange the code for tokens:', err.message);
  }
}).listen(PORT);
