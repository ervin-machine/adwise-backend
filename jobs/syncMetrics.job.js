const cron = require('node-cron');
const { metricsService } = require('../services');
const logger = require('../config/logger');

const runSync = async (trigger) => {
  try {
    const result = await metricsService.syncCampaignMetrics();
    logger.info(`[${trigger}] metrics sync complete: ${result.syncedRows} rows across ${result.campaigns} campaigns`);
  } catch (err) {
    logger.error(`[${trigger}] metrics sync failed: ${err.message}`);
  }
};

// Daily at 02:00 - Google Ads' own metrics for "today" are still accruing,
// so a once-a-day pull of the last 30 days is what keeps historical data
// correct without hammering the API.
const scheduleMetricsSync = () => {
  cron.schedule('0 2 * * *', () => runSync('scheduled'));

  // Also run once shortly after boot, so there's real data to look at
  // without waiting for the next 2am run.
  setTimeout(() => runSync('startup'), 5000);
};

module.exports = { scheduleMetricsSync, runSync };
