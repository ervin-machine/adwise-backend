const { status } = require('http-status');
const ApiError = require('../utils/ApiError');
const { Campaign } = require('../models');
const axios = require('axios')
const { Parser } = require('json2csv');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { nanoid } = require('nanoid');
const { enums, toMicros, ResourceNames } = require("google-ads-api");
const { customer } = require('./googleAdsClient');

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
          start_date: campaignBody.startDate,
          end_date: campaignBody.endDate,
          contains_eu_political_advertising: enums.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
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
    const campaignResult = result.mutate_operation_responses?.find(
      (r) => r.response === 'campaign_result'
    );
    const googleAdsCampaignId = campaignResult?.campaign_result?.resource_name?.split('/').pop();

    const campaign = await Campaign.create({ ...campaignBody, googleAdsCampaignId })
    return campaign
  } catch(err) {
    const adsMessage = err.errors?.map((e) => e.message).join('; ') || err.message;
    throw new ApiError(status.BAD_GATEWAY, adsMessage || 'Failed to create campaign in Google Ads');
  }
};

const getCampaigns = async (userId) => {
  return Campaign.find({ createdBy: userId }).sort({ createdAt: -1 });
};

  
  const getCampaignById = async (id) => {
    return Campaign.findById(id);
  };
  
  const updateCampaignById = async (campaignId, updateBody) => {
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      throw new ApiError(status.NOT_FOUND, 'Campaign not found');
    }
    Object.assign(campaign, updateBody);
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

  let result;
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

    result = response.data.choices[0].message.content;
  } catch (error) {
    throw new ApiError(
      status.BAD_GATEWAY,
      error.response?.data?.error?.message || 'Failed to generate campaign with AI'
    );
  }

  try {
    return JSON.parse(result);
  } catch (error) {
    throw new ApiError(status.BAD_GATEWAY, 'AI returned a response that could not be parsed');
  }
  }

  const exportToCsv = (campaigns) => {
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(campaigns)

    // A unique filename in the OS temp dir, not the source tree - writing into
    // services/ meant concurrent exports could race and overwrite each other,
    // and it wouldn't be writable at all once the container runs as a
    // non-root user with a read-only app directory.
    const filePath = path.join(os.tmpdir(), `campaigns-report-${nanoid()}.csv`);
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