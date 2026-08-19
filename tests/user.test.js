const request = require('supertest');
const app = require('../app');
const { createUser, authHeader } = require('./helpers');

describe('User routes', () => {
  // Regression: deleteUserById called document.remove(), which Mongoose
  // removed in v7+ - this threw on every call before the fix.
  test('an admin can delete another user without the request crashing', async () => {
    const admin = await createUser({ email: 'admin@example.com', role: 'admin' });
    const target = await createUser({ email: 'target@example.com' });

    await request(app)
      .delete(`/api/users/${target.id}`)
      .set('Authorization', authHeader(admin))
      .expect(204);
  });

  test('a regular user cannot delete a different user', async () => {
    const user = await createUser({ email: 'user1@example.com' });
    const other = await createUser({ email: 'user2@example.com' });

    await request(app)
      .delete(`/api/users/${other.id}`)
      .set('Authorization', authHeader(user))
      .expect(403);
  });

  test('a regular user can delete their own account', async () => {
    const user = await createUser({ email: 'self-delete@example.com' });

    await request(app)
      .delete(`/api/users/${user.id}`)
      .set('Authorization', authHeader(user))
      .expect(204);
  });
});
