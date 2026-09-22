const Redis = require('ioredis');

/**
 * REDIS CLIENT INITIALIZATION
 * ---------------------------
 * This file creates and exports a singleton instance of the Redis client.
 * In the VMS, Redis is strictly used for:
 * 1. Idempotency Keys: Caching responses of state-changing endpoints to prevent double-processing.
 * 2. Rate Limiting/Counters: Tracking the daily pre-approval limits (e.g. 5 invites/day/host).
 * 3. Short-lived caches: Lookups like the office list.
 * 
 * It is NEVER used as the source of truth for business data (that's PostgreSQL's job).
 */

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize the Redis client. ioredis automatically handles reconnections if the server drops.
const redis = new Redis(redisUrl, {
  retryStrategy(times) {
    // Reconnect after an exponentially increasing delay, up to 2 seconds max
    return Math.min(times * 50, 2000);
  },
});

redis.on('connect', () => {
  console.log(' Connected to Redis cache layer.');
});

redis.on('error', (err) => {
  console.error(' Redis Connection Error:', err);
});

module.exports = redis;
