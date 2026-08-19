const { status } = require('http-status');
const fs = require('fs');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { campaignService, metricsService } = require('../services');

const createCampaign = catchAsync(async (req, res) => {
  const campaign = await campaignService.createCampaign(req.body);
  res.status(status.CREATED).send(campaign);
});

const getCampaigns = catchAsync(async (req, res) => {
  const campaigns = await campaignService.getCampaigns(req.params.userId);
  res.status(status.OK).send(campaigns);
});

const getCampaign = catchAsync(async (req, res) => {
  const campaign = await campaignService.getCampaignById(req.params.campaignId);
  if (!campaign) {
    throw new ApiError(status.NOT_FOUND, 'Campaign not found');
  }
  res.send(campaign);
});

const updateCampaign = catchAsync(async (req, res) => {
  const campaign = await campaignService.updateCampaignById(req.params.campaignId, req.body);
  res.send(campaign);
});

const deleteCampaign = catchAsync(async (req, res) => {
  await campaignService.deleteCampaignById(req.params.campaignId);
  res.status(status.NO_CONTENT).send();
});

const generateGoogleAdsCampaign = catchAsync(async (req, res) => {
  const generatedAd = await campaignService.generateGoogleAdsCampaign(req.body.describeProduct, req.body.targetAudience);
  res.status(status.CREATED).send(generatedAd);
});

const syncMetrics = catchAsync(async (req, res) => {
  const result = await metricsService.syncCampaignMetrics();
  res.status(status.OK).send(result);
});

const getMetrics = catchAsync(async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const series = await metricsService.getMetricsSeries(req.user.id, days);
  res.status(status.OK).send(series);
});

const exportToCsv = catchAsync((req, res) => {
  const report = campaignService.exportToCsv(req.body);
  res.download(report, 'campaigns-report.csv', (err) => {
    fs.unlink(report, () => {});
    if (err) {
      console.error('Error sending file:', err);
      if (!res.headersSent) {
        res.status(500).send('Failed to send CSV');
      }
    }
  })
});

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  generateGoogleAdsCampaign,
  syncMetrics,
  getMetrics,
  exportToCsv
};