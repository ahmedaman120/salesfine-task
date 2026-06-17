import Redis from 'ioredis';
import config from '../../config';

// Single shared Redis client for the entire process.
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  lazyConnect: true, // connect explicitly via .connect() in server.ts
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('[Redis] connection error:', err.message);
});

export default redis;
