/**
 * Dependency-free, in-memory rate limiting.
 *
 * Good enough for a single-process deployment. If you ever run several API
 * instances behind a load balancer, swap the Map for Redis so the counters are
 * shared.
 */

const buckets = new Map();

// Drop expired buckets every minute so the Map cannot grow forever.
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000);
sweeper.unref?.();

const clientIp = (req) =>
  req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';

/**
 * @param {object}   options
 * @param {number}   options.windowMs  Size of the rolling window.
 * @param {number}   options.max       Allowed requests per window.
 * @param {string}   options.message   Body message sent on 429.
 * @param {Function} [options.keyGenerator] Defaults to the client IP.
 */
function rateLimit({ windowMs, max, message = 'Too many requests, please try again later', keyGenerator = clientIp }) {
  return function rateLimiter(req, res, next) {
    // Lets the test suite hammer the auth endpoints without tripping the limit.
    if (process.env.DISABLE_RATE_LIMIT === 'true') return next();

    const key = `${req.baseUrl}${req.path}:${keyGenerator(req)}`;
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (bucket.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({ message, retryAfter: resetSeconds });
    }

    next();
  };
}

/** Clears every counter. Used by the test suite. */
rateLimit.reset = () => buckets.clear();

module.exports = { rateLimit };
