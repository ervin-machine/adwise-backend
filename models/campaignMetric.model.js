const mongoose = require('mongoose');

// One row per (campaign, day) - a daily snapshot pulled from the Google Ads
// reporting API, so the app has real history to chart instead of only
// whatever the campaign's live totals happen to be right now.
const campaignMetricSchema = mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    costMicros: {
      type: Number,
      default: 0,
    },
    conversions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

campaignMetricSchema.index({ campaign: 1, date: 1 }, { unique: true });

const CampaignMetric = mongoose.model('CampaignMetric', campaignMetricSchema);

module.exports = CampaignMetric;
