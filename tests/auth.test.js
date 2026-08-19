const request = require('supertest');
const app = require('../app');
const { createUser, authHeader } = require('./helpers');

describe('Auth routes', () => {
  test('registers a new user and never returns the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new@example.com',
        company: 'Acme',
        phone: '+1234567890',
        password: 'password1',
        name: 'New User',
      })
      .expect(201);

    expect(res.body.user.email).toBe('new@example.com');
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.tokens.access.token).toBeDefined();
  });

  test('rejects registering the same email twice', async () => {
    const body = {
      email: 'dupe@example.com',
      company: 'Acme',
      phone: '+1234567890',
      password: 'password1',
      name: 'Dupe',
    };
    await request(app).post('/api/auth/register').send(body).expect(201);
    await request(app).post('/api/auth/register').send(body).expect(400);
  });

  test('logs in with correct credentials', async () => {
    await createUser({ email: 'login@example.com', password: 'password1' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password1' })
      .expect(200);

    expect(res.body.tokens.access.token).toBeDefined();
  });

  test('rejects login with the wrong password', async () => {
    await createUser({ email: 'login2@example.com', password: 'password1' });

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'login2@example.com', password: 'wrongpassword' })
      .expect(401);
  });

  // Regression: this route previously had no auth() middleware at all - anyone
  // could PUT any user's id and set their role to admin.
  test('PUT /api/auth/:userId requires authentication', async () => {
    const target = await createUser();

    await request(app)
      .put(`/api/auth/${target.id}`)
      .send({ role: 'admin' })
      .expect(401);
  });

  // Regression: the mass-assignment path that let a logged-in user escalate
  // their own role, since updateUserById had no field whitelist.
  test('PUT /api/auth/:userId rejects a role field even from the account owner', async () => {
    const user = await createUser();

    const res = await request(app)
      .put(`/api/auth/${user.id}`)
      .set('Authorization', authHeader(user))
      .send({ name: 'Updated Name', role: 'admin' })
      .expect(400);

    expect(res.body.message).toMatch(/role/i);
  });

  test('PUT /api/auth/:userId lets a user update their own profile', async () => {
    const user = await createUser();

    const res = await request(app)
      .put(`/api/auth/${user.id}`)
      .set('Authorization', authHeader(user))
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(res.body.user.name).toBe('Updated Name');
  });

  // Regression: validate.js never checked the `cookies` part of the schema,
  // so a missing refreshToken fell through to an unfiltered Mongo query
  // instead of being rejected here.
  test('refresh-tokens without a cookie is rejected up front', async () => {
    const res = await request(app).post('/api/auth/refresh-tokens').expect(400);
    expect(res.body.message).toMatch(/refreshToken/);
  });

  test('/auth/me without a cookie is rejected the same way', async () => {
    await request(app).get('/api/auth/me').expect(400);
  });
});
