const { status } = require('http-status');
const ApiError = require('../utils/ApiError');
const { Campaign } = require('../models');
const axios = require('axios')
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');


const createCampaign = async (campaignBody) => {
  try {
    const campaign = await Campaign.create(campaignBody)
    return campaign
  } catch(err) {
    console.log(err)
  }
  
};

const getCampaigns = async (userId) => {
    const campaigns = await Campaign.find({ createdBy: userId }).sort({ createdAt: -1 });;
    return campaigns;
  };
  
  const getCampaignById = async (id) => {
    return Campaign.findById(id);
  };
  
  const updateCampaignById = async (campaignId, updateBody) => {
    console.log(campaignId, updateBody)
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      throw new ApiError(status.NOT_FOUND, 'Campaign not found');
    }
    Object.assign(campaign, updateBody.updatedCampaign);
    await campaign.save();
    return campaign;
  };
  
  const deleteCampaignById = async (campaignId) => {
    const campaign = await Campaign.deleteOne({ _id: campaignId });
    return campaign;
  };

  const generateGoogleAdsCampaign = async (describeProduct, targetAudience) => {
    const prompt = `
You are an API that generates ONLY raw JSON. NO explanations, no preamble, no code block formatting.

Generate a Google Ads campaign plan with these details:
- Product: ${describeProduct}
- Target Audience: ${targetAudience}

Return strictly and only a raw JSON object with the following keys:
{
  "campaignName": "...",
  "campaignType": "...", 
  "budget": "...",
  "startDate": "...",
  "endDate": "...",
  "targetingInfo": {
    "location": "...",
    "age": {
      min: "...",
      max: "..."
    },
    "interests": [...]
  }
}
`;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a digital marketing assistant specializing in Google Ads." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data.choices[0].message.content;
    console.log("Generated Campaign:", JSON.parse(result));
    return result

  } catch (error) {
    console.error("Error generating campaign:", error.response?.data || error.message);
  }
  }

  const exportToCsv = (campaigns) => {
    const json2csvParser = new Parser();
    console.log(campaigns)
    const csv = json2csvParser.parse(campaigns)

    const filePath = path.join(__dirname, 'campaigns-report.csv');
    fs.writeFileSync(filePath, csv);
    return filePath;
  }

module.exports = {
  createCampaign,
  getCampaigns,
  updateCampaignById,
  deleteCampaignById,
  generateGoogleAdsCampaign,
  exportToCsv
};