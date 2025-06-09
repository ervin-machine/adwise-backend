const { status } = require('http-status');
const ApiError = require('../utils/ApiError');
const { Campaign } = require('../models');
const axios = require('axios')
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const { GoogleAdsApi, resources,
  enums,
  toMicros,
  ResourceNames,
  MutateOperation, } = require("google-ads-api");

const client = new GoogleAdsApi({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  developer_token: process.env.DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: "2565974735",
  login_customer_id: process.env.LOGIN_CUSTOMER_ID,
  refresh_token: process.env.REFRESH_TOKEN,
});

function mapAgeRange(minAge, maxAge) {
  const ageEnums = [];

  const ranges = [
    { min: 18, max: 24, value: enums.AgeRangeType.AGE_18_24 },
    { min: 25, max: 34, value: enums.AgeRangeType.AGE_25_34 },
    { min: 35, max: 44, value: enums.AgeRangeType.AGE_35_44 },
    { min: 45, max: 54, value: enums.AgeRangeType.AGE_45_54 },
    { min: 55, max: 64, value: enums.AgeRangeType.AGE_55_64 },
    { min: 65, max: Infinity, value: enums.AgeRangeType.AGE_65_UP },
  ];

  for (const range of ranges) {
    if (
      (minAge == null || range.max >= minAge) &&
      (maxAge == null || range.min <= maxAge)
    ) {
      ageEnums.push(range.value);
    }
  }

  return ageEnums;
}

const createCampaign = async (campaignBody) => {
  try {
    const parsedLocations = campaignBody.targetingInfo.location
    .split(',')
    .map(id => id.trim());
    const budgetResourceName = ResourceNames.campaignBudget(
      customer.credentials.customer_id,
      "-1"
    );
    
    const campaignResourceName = ResourceNames.campaign(
      customer.credentials.customer_id,
      "-2"
    );
    
    const adGroupResourceName = ResourceNames.adGroup(
      customer.credentials.customer_id,
      "-3"
    );
    
    // Destructure targeting info from the form
    const { age, location, interests = [] } = campaignBody.targetingInfo;
    
    // Convert comma-separated location string into array
    const locationList = typeof location === "string"
      ? location.split(",").map((id) => id.trim()).filter(Boolean)
      : [];
    
    const operations = [
      // 1. Create Budget
      {
        entity: "campaign_budget",
        operation: "create",
        resource: {
          resource_name: budgetResourceName,
          name: `${campaignBody.campaignName} Budget`,
          delivery_method: enums.BudgetDeliveryMethod.STANDARD,
          amount_micros: toMicros(campaignBody.budget),
        },
      },
    
      // 2. Create Campaign
      {
        entity: "campaign",
        operation: "create",
        resource: {
          resource_name: campaignResourceName,
          name: campaignBody.campaignName,
          advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
          status: enums.CampaignStatus.ENABLED,
          manual_cpc: {
            enhanced_cpc_enabled: false,
          },
          campaign_budget: budgetResourceName,
          start_date: "2025-06-10",
          end_date: "2025-06-30",
          network_settings: {
            target_google_search: true,
            target_search_network: true,
          },
        },
      },
    
      // 3. Create Ad Group
      {
        entity: "ad_group",
        operation: "create",
        resource: {
          resource_name: adGroupResourceName,
          name: `${campaignBody.campaignName} Ad Group`,
          campaign: campaignResourceName,
          type: enums.AdGroupType.SEARCH_STANDARD,
          status: enums.AdGroupStatus.ENABLED,
        },
      },
    
      // 4. Dynamic Location Targeting
      ...locationList.map((locCode) => ({
        entity: "ad_group_criterion",
        operation: "create",
        resource: {
          ad_group: adGroupResourceName,
          location: {
            geo_target_constant: `geoTargetConstants/${locCode}`,
          },
          status: enums.AdGroupCriterionStatus.ENABLED,
        },
      })),
    
      // 5. Age Ranges (based on min and max age)
      ...mapAgeRange(age?.min, age?.max).map((ageEnum) => ({
        entity: "ad_group_criterion",
        operation: "create",
        resource: {
          ad_group: adGroupResourceName,
          age_range: {
            type: ageEnum,
          },
          status: enums.AdGroupCriterionStatus.ENABLED,
        },
      })),
    
      // 6. Interests (userInterestConstants/ID)
      ...interests.map((interestId) => ({
        entity: "ad_group_criterion",
        operation: "create",
        resource: {
          ad_group: adGroupResourceName,
          user_interest: {
            user_interest_category: `userInterestConstants/${interestId}`,
          },
          status: enums.AdGroupCriterionStatus.ENABLED,
        },
      })),
    ];
    
    // Final API call to Google Ads
    const result = await customer.mutateResources(operations);
    
    
    const campaign = await Campaign.create(campaignBody)
    return campaign
  } catch(err) {
    console.log(err)
  }
  
};

const getCampaigns = async (userId) => {
  try {


const campaigns = await customer.report({
  entity: "campaign",
  attributes: [
    "campaign.id",
    "campaign.name",
    "campaign.bidding_strategy_type",
    "campaign_budget.amount_micros",
  ],
  metrics: [
    "metrics.cost_micros",
    "metrics.clicks",
    "metrics.impressions",
    "metrics.all_conversions",
  ],
  constraints: {
    "campaign.status": enums.CampaignStatus.ENABLED,
  },
  limit: 20,
});
  console.log(campaigns)
    return campaigns
  } catch (err) {
    console.error("Error in getCampaigns:", err);
  }
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