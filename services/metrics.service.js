const moment = require('moment');
const { Campaign, CampaignMetric } = require('../models');
const { customer } = require('./googleAdsClient');
const logger = require('../config/logger');

// Pulls the last 30 days of daily metrics for every campaign that has a real
// Google Ads campaign behind it, and upserts one CampaignMetric row per
// (campaign, day). Safe to run repeatedly - re-syncing a day just overwrites
// that day's row with the latest numbers instead of duplicating it.
const syncCampaignMetrics = async () => {
  const campaigns = await Campaign.find({
    googleAdsCampaignId: { $exists: true, $ne: null },
  });

  if (campaigns.length === 0) {
    return { syncedRows: 0, campaigns: 0 };
  }

  const campaignByGoogleId = new Map(
    campaigns.map((campaign) => [String(campaign.googleAdsCampaignId), campaign])
  );
  const googleIds = [...campaignByGoogleId.keys()];

  const rows = await customer.query(`
    SELECT campaign.id, segments.date, metrics.impressions, metrics.clicks,
           metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE campaign.id IN (${googleIds.join(',')})
      AND segments.date DURING LAST_30_DAYS
  `);

  let syncedRows = 0;
  for (const row of rows) {
    const campaign = campaignByGoogleId.get(String(row.campaign.id));
    if (!campaign) continue;

    await CampaignMetric.findOneAndUpdate(
      { campaign: campaign._id, date: new Date(row.segments.date) },
      {
        impressions: row.metrics.impressions || 0,
        clicks: row.metrics.clicks || 0,
        costMicros: row.metrics.cost_micros || 0,
        conversions: row.metrics.conversions || 0,
      },
      { upsert: true, new: true }
    );
    syncedRows += 1;
  }

  logger.info(`Synced ${syncedRows} campaign metric rows across ${campaigns.length} campaigns`);
  return { syncedRows, campaigns: campaigns.length };
};

// Aggregated daily totals across all of a user's campaigns, for charting.
const getMetricsSeries = async (userId, days = 30) => {
  const campaigns = await Campaign.find({ createdBy: userId });
  const campaignIds = campaigns.map((campaign) => campaign._id);

  if (campaignIds.length === 0) {
    return [];
  }

  const since = moment().subtract(days, 'days').startOf('day').toDate();

  const rows = await CampaignMetric.find({
    campaign: { $in: campaignIds },
    date: { $gte: since },
  }).sort({ date: 1 });

  const byDate = new Map();
  for (const row of rows) {
    const key = moment(row.date).format('YYYY-MM-DD');
    const existing = byDate.get(key) || {
      date: key,
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
    };
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.cost += row.costMicros / 1_000_000;
    existing.conversions += row.conversions;
    byDate.set(key, existing);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
};

module.exports = {
  syncCampaignMetrics,
  getMetricsSeries,
};
