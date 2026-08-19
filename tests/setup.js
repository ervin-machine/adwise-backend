const mongoose = require('mongoose');

// Uses the local MongoDB instance (already required to run the app itself)
// with a dedicated database, rather than mongodb-memory-server - avoids a
// large one-time binary download and this project already assumes a local
// Mongo is running for development.
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/adwise-test';

beforeAll(async () => {
  await mongoose.connect(TEST_MONGO_URI);
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});
