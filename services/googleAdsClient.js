const { GoogleAdsApi } = require("google-ads-api");

const client = new GoogleAdsApi({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  developer_token: process.env.DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: "2565974735",
  login_customer_id: process.env.LOGIN_CUSTOMER_ID,
  refresh_token: process.env.REFRESH_TOKEN,
});

module.exports = { client, customer };
