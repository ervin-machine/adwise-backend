const mongoose = require('mongoose');

const campaignSchema = mongoose.Schema(
  {
    createdBy: {
      type: String
    },
    googleAdsCampaignId: {
      type: String,
    },
    campaignName: {
      type: String,
      required: true,
      trim: true,
    },
    campaignType: {
      type: String,
      required: true,
      trim: true,
    },
    budget: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: String,
      required: true,
      trim: true,
    },
    endDate: {
        type: String,
        required: true,
        trim: true,
      },
    // Not required: the current CampaignForm only sends targetingInfo (a
    // structured object below on the Google Ads mutation itself), not this
    // flat field. Kept for backward compatibility with any older records.
    targeting: {
      type: String,
      trim: true,
    },
    clicks: {
      type: String,
    },
    ctr: {
      type: String
    },
    impressions: {
      type: String
    },
    spend: {
      type: String
    },
    status: {
      type: String
    },
    performance: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;