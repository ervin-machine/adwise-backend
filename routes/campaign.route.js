const express = require('express');
const campaignController = require('../controllers/campaign.controller');

const router = express.Router();

router.post('/create', campaignController.createCampaign);
router.post('/generatead', campaignController.generateGoogleAdsCampaign);
router.get('/:userId', campaignController.getCampaigns);
router.get('/:campaignId', campaignController.getCampaign);
router.put('/:campaignId', campaignController.updateCampaign);
router.delete('/:campaignId', campaignController.deleteCampaign);
router.post('/export-csv', campaignController.exportToCsv)

module.exports = router;