interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// raw fetch to upstash REST endpoint avoids heavy redis npm client dependencies
async function executeUpstashCommand(command: (string | number)[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`Upstash REST API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data?.result;
  } catch (err) {
    console.warn('Upstash REST Fetch Error (falling back to memory):', err);
    return null;
  }
}

// fallback in-memory state when upstash env vars are missing
const inMemoryRateMap = new Map<string, number[]>();

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const limit = 20;
  const windowSeconds = 60;
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redisKey = `ratelimit:${identifier}:${currentMinute}`;
    const count = await executeUpstashCommand(['INCR', redisKey]);

    if (typeof count === 'number') {
      if (count === 1) {
        await executeUpstashCommand(['EXPIRE', redisKey, windowSeconds]);
      }

      const remaining = Math.max(0, limit - count);
      return {
        success: count <= limit,
        limit,
        remaining,
        reset: (currentMinute + 1) * 60000,
      };
    }
  }

  // fallback sliding window using in-memory timestamps
  const windowMs = windowSeconds * 1000;
  const timestamps = (inMemoryRateMap.get(identifier) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: now + windowMs,
    };
  }

  timestamps.push(now);
  inMemoryRateMap.set(identifier, timestamps);

  return {
    success: true,
    limit,
    remaining: limit - timestamps.length,
    reset: now + windowMs,
  };
}

const inMemoryCacheMap = new Map<string, { value: any; expiresAt: number }>();

export async function getCachedResponse(key: string): Promise<any | null> {
  const cacheKey = `parcelpilot_faq:${key.toLowerCase().trim()}`;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const rawResult = await executeUpstashCommand(['GET', cacheKey]);
    if (rawResult) {
      try {
        return typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
      } catch {
        return rawResult;
      }
    }
  }

  const memCached = inMemoryCacheMap.get(cacheKey);
  if (memCached) {
    if (Date.now() < memCached.expiresAt) {
      return memCached.value;
    }
    inMemoryCacheMap.delete(cacheKey);
  }

  return null;
}

export async function setCachedResponse(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  const cacheKey = `parcelpilot_faq:${key.toLowerCase().trim()}`;
  const serialized = JSON.stringify(value);

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    await executeUpstashCommand(['SET', cacheKey, serialized, 'EX', ttlSeconds]);
  }

  inMemoryCacheMap.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
