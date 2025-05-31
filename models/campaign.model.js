const mongoose = require('mongoose');

const campaignSchema = mongoose.Schema(
  {
    createdBy: {
      type: String
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
    targeting: {
      type: String,
      required: true,
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