jest.mock('../services/googleAdsClient', () => ({
  customer: {
    credentials: { customer_id: '2565974735' },
    mutateResources: jest.fn(),
    query: jest.fn(),
  },
}));

const request = require('supertest');
const app = require('../app');
const { customer } = require('../services/googleAdsClient');
const { Campaign } = require('../models');
const { createUser, authHeader } = require('./helpers');

const targetingInfo = { location: '', age: { min: '', max: '' }, interests: [] };

const campaignPayload = (overrides = {}) => ({
  campaignName: 'Test Campaign',
  campaignType: 'Search',
  budget: '50',
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  targetingInfo,
  clicks: '0',
  ctr: '0',
  impressions: '0',
  spend: '0',
  status: 'active',
  performance: '0',
  ...overrides,
});

beforeEach(() => {
  customer.mutateResources.mockReset();
  customer.query.mockReset();
});

describe('Campaign routes', () => {
  // Regression: every campaign route used to have no auth() middleware at
  // all - anyone could read/write/delete any campaign.
  test('rejects unauthenticated requests on every route', async () => {
    await request(app).post('/api/campaign/create').send({}).expect(401);
    await request(app).get('/api/campaign/000000000000000000000000').expect(401);
    await request(app).get('/api/campaign/metrics').expect(401);
    await request(app).post('/api/campaign/sync-metrics').expect(401);
  });

  test('creates a campaign and stores the real Google Ads campaign id', async () => {
    const user = await createUser();
    customer.mutateResources.mockResolvedValue({
      mutate_operation_responses: [
        { response: 'campaign_budget_result', campaign_budget_result: { resource_name: 'customers/123/campaignBudgets/1' } },
        { response: 'campaign_result', campaign_result: { resource_name: 'customers/123/campaigns/999888777' } },
        { response: 'ad_group_result', ad_group_result: { resource_name: 'customers/123/adGroups/1' } },
      ],
    });

    const res = await request(app)
      .post('/api/campaign/create')
      .set('Authorization', authHeader(user))
      .send(campaignPayload({ createdBy: user.id }))
      .expect(201);

    expect(res.body.googleAdsCampaignId).toBe('999888777');
    expect(customer.mutateResources).toHaveBeenCalledTimes(1);
  });

  // Regression: createCampaign used to catch(err) { console.log(err) } with
  // no rethrow, so a failed Ads mutation still returned 201 with an empty body.
  test('surfaces a real error when the Ads mutation fails, instead of a silent success', async () => {
    const user = await createUser();
    customer.mutateResources.mockRejectedValue({
      errors: [{ message: 'The required field was not present.' }],
    });

    const res = await request(app)
      .post('/api/campaign/create')
      .set('Authorization', authHeader(user))
      .send(campaignPayload({ createdBy: user.id }))
      .expect(502);

    expect(res.body.message).toContain('required field');

    const stored = await Campaign.find({});
    expect(stored).toHaveLength(0);
  });

  // Regression: getCampaigns used to ignore userId entirely and call the
  // Google Ads reporting API directly, returning every campaign to everyone.
  test('only returns campaigns belonging to the requesting user', async () => {
    const owner = await createUser({ email: 'owner@example.com' });
    const other = await createUser({ email: 'other@example.com' });

    await Campaign.create({ ...campaignPayload({ createdBy: owner.id }), campaignName: 'Owner Campaign' });
    await Campaign.create({ ...campaignPayload({ createdBy: other.id }), campaignName: 'Other Campaign' });

    const res = await request(app)
      .get(`/api/campaign/${owner.id}`)
      .set('Authorization', authHeader(owner))
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].campaignName).toBe('Owner Campaign');
  });

  test('sync-metrics is a no-op when no campaigns have a linked Google Ads id', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/campaign/sync-metrics')
      .set('Authorization', authHeader(user))
      .expect(200);

    expect(res.body).toEqual({ syncedRows: 0, campaigns: 0 });
    expect(customer.query).not.toHaveBeenCalled();
  });

  test('metrics endpoint returns an empty series for a user with no campaigns', async () => {
    const user = await createUser();

    const res = await request(app)
      .get('/api/campaign/metrics')
      .set('Authorization', authHeader(user))
      .expect(200);

    expect(res.body).toEqual([]);
  });
});
