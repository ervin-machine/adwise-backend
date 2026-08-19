require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const { scheduleMetricsSync } = require('./jobs/syncMetrics.job');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  scheduleMetricsSync();

  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
};

startServer();
