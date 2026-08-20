const Joi = require('joi');
const { objectId } = require('./custom.validation');

const numericField = Joi.alternatives().try(Joi.string(), Joi.number());

const targetingInfo = Joi.object({
  location: Joi.string().allow(''),
  age: Joi.object({
    min: numericField.allow(''),
    max: numericField.allow(''),
  }),
  interests: Joi.array().items(Joi.string()),
});

const createCampaign = {
  body: Joi.object().keys({
    createdBy: Joi.string().allow(''),
    campaignName: Joi.string().required(),
    campaignType: Joi.string().required(),
    budget: numericField.required(),
    startDate: Joi.string().required(),
    endDate: Joi.string().required(),
    targeting: Joi.string().allow(''),
    targetingInfo: targetingInfo,
    interests: Joi.string().allow(''),
    confirmed: Joi.boolean(),
    clicks: numericField,
    ctr: numericField,
    impressions: numericField,
    spend: numericField,
    status: Joi.string(),
    performance: numericField,
  }),
};

const getCampaigns = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const getCampaign = {
  params: Joi.object().keys({
    campaignId: Joi.string().custom(objectId),
  }),
};

const updateCampaign = {
  params: Joi.object().keys({
    campaignId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      createdBy: Joi.string().allow(''),
      campaignName: Joi.string(),
      campaignType: Joi.string(),
      budget: numericField,
      startDate: Joi.string(),
      endDate: Joi.string(),
      targeting: Joi.string().allow(''),
      targetingInfo: targetingInfo,
      interests: Joi.string().allow(''),
      confirmed: Joi.boolean(),
      clicks: numericField,
      ctr: numericField,
      impressions: numericField,
      spend: numericField,
      status: Joi.string(),
      performance: numericField,
    })
    .min(1),
};

const updateCampaignStatus = {
  params: Joi.object().keys({
    campaignId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('active', 'paused').required(),
  }),
};

const deleteCampaign = {
  params: Joi.object().keys({
    campaignId: Joi.string().custom(objectId),
  }),
};

const generateGoogleAdsCampaign = {
  body: Joi.object().keys({
    describeProduct: Joi.string().required(),
    targetAudience: Joi.string().required(),
  }),
};

const exportToCsv = {
  body: Joi.array().items(Joi.object()).required(),
};

const getMetrics = {
  query: Joi.object().keys({
    days: Joi.number().integer().min(1).max(90),
  }),
};

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  generateGoogleAdsCampaign,
  exportToCsv,
  getMetrics,
};
