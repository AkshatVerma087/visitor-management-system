require('dotenv').config();
const http = require('http');
const app = require('./src/app');

const { initSocket } = require('./src/socket/socket');
const { startCronJobs } = require('./src/jobs/cron.jobs');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start background cron jobs (Overstay Detection & Auto-Expire)
startCronJobs();

server.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
});
