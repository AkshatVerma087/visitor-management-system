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

// Graceful Shutdown implementation
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
  });

  try {
    const prisma = require('./src/lib/prisma');
    const redis = require('./src/lib/redis');
    
    // Close Prisma connection
    await prisma.$disconnect();
    console.log('PostgreSQL connection closed.');

    // Close Redis connection
    await redis.quit();
    console.log('Redis connection closed.');

    console.log('Graceful shutdown completed successfully. Exiting.');
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
