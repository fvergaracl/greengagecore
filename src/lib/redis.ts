// GreenCrowd V2 — Redis client singleton (ioredis)
import Redis from "ioredis"

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient() {
  const client = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
  })

  client.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
      console.error("[Redis] Connection error:", err.message)
    }
  })

  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}

// ─────────────────────────────────────────────────────────────
// Cache helpers
// ─────────────────────────────────────────────────────────────

const CACHE_KEYS = {
  gameWallet: (userId: string, campaignId: string) =>
    `game:wallet:${userId}:${campaignId}`,
  gameSimulate: (userId: string, taskId: string) =>
    `game:simulate:${userId}:${taskId}`,
  gameRank: (campaignId: string) => `game:rank:${campaignId}`,
  rateLimit: (ip: string) => `ratelimit:${ip}`,
} as const

export { CACHE_KEYS }

/**
 * Get-or-set with TTL. If the key exists, returns the cached value.
 * Otherwise, executes the factory and stores the result.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached) as T
  }
  const value = await factory()
  await redis.setex(key, ttlSeconds, JSON.stringify(value))
  return value
}

/**
 * Sliding window rate limiter (100 req/min per IP).
 * Returns true if the request is within the limit.
 */
export async function checkRateLimit(
  ip: string,
  limit = 100,
  windowSeconds = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const key = CACHE_KEYS.rateLimit(ip)
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, now - windowMs)
  pipeline.zadd(key, now, `${now}-${Math.random()}`)
  pipeline.zcard(key)
  pipeline.expire(key, windowSeconds)

  const results = await pipeline.exec()
  const count = (results?.[2]?.[1] as number) ?? 0

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  }
}
