const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const campaignValidation = require('../validations/campaign.validation');
const campaignController = require('../controllers/campaign.controller');

const router = express.Router();

router.post('/create', auth(), validate(campaignValidation.createCampaign), campaignController.createCampaign);
router.post('/generatead', auth(), validate(campaignValidation.generateGoogleAdsCampaign), campaignController.generateGoogleAdsCampaign);
// Static paths declared before the /:userId and /:campaignId catch-alls below,
// which would otherwise swallow them (Express matches route order, not specificity).
router.get('/metrics', auth(), validate(campaignValidation.getMetrics), campaignController.getMetrics);
router.post('/sync-metrics', auth(), campaignController.syncMetrics);
router.get('/:userId', auth(), validate(campaignValidation.getCampaigns), campaignController.getCampaigns);
router.get('/:campaignId', auth(), validate(campaignValidation.getCampaign), campaignController.getCampaign);
router.put('/:campaignId', auth(), validate(campaignValidation.updateCampaign), campaignController.updateCampaign);
router.patch('/:campaignId/status', auth(), validate(campaignValidation.updateCampaignStatus), campaignController.updateCampaignStatus);
router.delete('/:campaignId', auth(), validate(campaignValidation.deleteCampaign), campaignController.deleteCampaign);
router.post('/export-csv', auth(), validate(campaignValidation.exportToCsv), campaignController.exportToCsv)

module.exports = router;