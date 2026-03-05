import Redis from "ioredis"

const globalForBull = globalThis as unknown as {
  redisBull: Redis | undefined
}

function createRedisBullClient() {
  const client = new Redis(process.env.REDIS_URL!, {
    // BullMQ requirement for blocking connections:
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true
  })

  client.on("error", err => {
    if (process.env.NODE_ENV !== "test") {
      console.error("[Redis/BullMQ] Connection error:", err.message)
    }
  })

  return client
}

export const redisBull = globalForBull.redisBull ?? createRedisBullClient()

if (process.env.NODE_ENV !== "production") {
  globalForBull.redisBull = redisBull
}
