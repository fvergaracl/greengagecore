// GreenCrowd V2 — BullMQ Worker entry point
// Processes: pending rewards, push notifications, async exports.
// Runs as a separate process: `npm run worker`

import { Worker, Queue, type ConnectionOptions } from "bullmq"
import { redisBull } from "@/lib/redis-bullmq"

// BullMQ acepta una instancia ioredis como connection
const connection = { connection: redisBull as unknown as ConnectionOptions }
// ─────────────────────────────────────────────────────────────
// Queue definitions (exportadas para usar en la app principal)
// ─────────────────────────────────────────────────────────────

export const rewardsQueue = new Queue("rewards", connection)
export const pushQueue = new Queue("push-notifications", connection)
export const exportQueue = new Queue("exports", connection)
export const analyticsRefreshQueue = new Queue("analytics-refresh", connection)

// ─────────────────────────────────────────────────────────────
// Workers
// ─────────────────────────────────────────────────────────────

const workerOpts = { connection: redisBull as unknown as ConnectionOptions }

// Worker: Procesa reward_events pendientes (cuando GAME vuelve a estar disponible)
const rewardsWorker = new Worker(
  "rewards",
  async job => {
    const { processRewardEvent, retryPendingRewards } = await import("./processors/rewards")

    if (job.name === "process-pending") {
      await retryPendingRewards()
      return
    }

    if (job.name === "process-one") {
      const { rewardEventId } = job.data as { rewardEventId?: string }
      if (!rewardEventId) return // o throw new Error("Missing rewardEventId")
      await processRewardEvent(rewardEventId)
      return
    }

    // fallback: no-op
  },
  { ...workerOpts, concurrency: 5 }
)

// Worker: Push notifications (FCM/APNs/WebPush)
const pushWorker = new Worker(
  "push-notifications",
  async job => {
    const { sendPushNotification } = await import("./processors/push")
    await sendPushNotification(job.data)
  },
  { ...workerOpts, concurrency: 10 }
)

// Worker: Exportaciones async (CSV, GeoJSON, ZIP)
const exportWorker = new Worker(
  "exports",
  async job => {
    const { processExport } = await import("./processors/export")
    await processExport(job.data)
  },
  { ...workerOpts, concurrency: 2 }
)

// Worker: Refresh de views materializadas de analytics
const analyticsWorker = new Worker(
  "analytics-refresh",
  async () => {
    const { prisma } = await import("@/lib/db")
    try {
      await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY v_campaign_stats`
    } catch {
      // Fallback si la view no soporta CONCURRENTLY (primera vez sin datos)
      await prisma.$executeRaw`REFRESH MATERIALIZED VIEW v_campaign_stats`
    }
  },
  { ...workerOpts, concurrency: 1 }
)

// ─────────────────────────────────────────────────────────────
// Scheduled jobs (repeating)
// ─────────────────────────────────────────────────────────────

// Refrescar analytics views cada 15 minutos
analyticsRefreshQueue.add(
  "refresh-views",
  {},
  { repeat: { every: 15 * 60 * 1000 }, jobId: "analytics-refresh-scheduled" }
)

// Procesar rewards pendientes cada minuto (retry de GAME)
rewardsQueue.add(
  "process-pending",
  { mode: "pending-retry" },
  { repeat: { every: 60 * 1000 }, jobId: "rewards-pending-retry" }
)

// ─────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────

for (const worker of [
  rewardsWorker,
  pushWorker,
  exportWorker,
  analyticsWorker
]) {
  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message)
  })
  worker.on("error", err => {
    console.error("[Worker] Worker error:", err.message)
  })
}

console.info("[Worker] GreenCrowd BullMQ workers started")

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.info("[Worker] SIGTERM received — closing workers")
  await Promise.all([
    rewardsWorker.close(),
    pushWorker.close(),
    exportWorker.close(),
    analyticsWorker.close()
  ])
  process.exit(0)
})
