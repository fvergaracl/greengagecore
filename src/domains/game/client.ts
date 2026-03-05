// GreenCrowd V2 — GAME Engine client with Circuit Breaker
// Aligned with GAME Swagger v1.2.047 (POST /games, /tasks, /points, /wallet, /action)
import CircuitBreaker from "opossum"
import { redis, CACHE_KEYS } from "@/lib/redis"
import { buildCampaignExternalGameId, buildPoiTaskExternalTaskId, buildOpenTaskExternalTaskId } from "./external-ids"

const GAME_BASE_URL = process.env.API_GAME_BASE_URL
const GAME_API_KEY = process.env.API_GAME_APIKEY

// ─────────────────────────────────────────────────────────────
// Types (aligned with GAME Swagger v1.2.047)
// ─────────────────────────────────────────────────────────────

export type GameParam = { key: string; value: string | number | boolean }

export type GameCreated = {
  gameId: string
  externalGameId: string
  strategyId?: string
  platform?: string
  params?: Array<GameParam & { id?: string }>
}

export type TaskCreated = {
  message?: string
  externalTaskId: string
  externalGameId: string
  gameParams?: GameParam[]
  taskParams?: GameParam[]
}

export type AssignPointsResult = {
  points: number
  caseName: string
  isACreatedUser: boolean
  gameId: string
  externalTaskId: string
  created_at: string
}

export type WalletTransaction = {
  transactionType: string
  points: number
  coins: number
  data?: Record<string, unknown>
  id: string
  created_at: string
}

export type UserWallet = {
  externalUserId?: string
  totalPoints?: number
  coins?: number
  transactions?: WalletTransaction[]
  [key: string]: unknown
}

export type UserPoints = {
  externalGameId: string
  created_at: string
  task: Array<{
    externalTaskId?: string
    points?: number
    timesAwarded?: number
    [key: string]: unknown
  }>
}

// ─────────────────────────────────────────────────────────────
// HTTP helper
// ─────────────────────────────────────────────────────────────

async function gameRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  if (!GAME_BASE_URL || !GAME_API_KEY) {
    throw new Error("GAME not configured (API_GAME_BASE_URL or API_GAME_APIKEY missing)")
  }

  const res = await fetch(`${GAME_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": GAME_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000), // 10s timeout
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`GAME API error ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ─────────────────────────────────────────────────────────────
// Circuit Breaker
// ─────────────────────────────────────────────────────────────

const breakerOptions = {
  timeout: 10_000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
  volumeThreshold: 3,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gameBreaker = new CircuitBreaker(gameRequest as (...args: any[]) => Promise<any>, breakerOptions)

gameBreaker.on("open", () => {
  console.warn("[GAME] Circuit breaker OPEN — GAME appears to be down")
})
gameBreaker.on("halfOpen", () => {
  console.info("[GAME] Circuit breaker HALF-OPEN — probing GAME")
})
gameBreaker.on("close", () => {
  console.info("[GAME] Circuit breaker CLOSED — GAME is back")
})

async function safeGameRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (await gameBreaker.fire(method, path, body)) as T
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// GAME API — Game lifecycle
// ─────────────────────────────────────────────────────────────

/**
 * Find an existing game in GAME by its externalGameId.
 * GET /games?externalGameId={externalGameId}
 */
export async function findGameByExternalId(externalGameId: string): Promise<GameCreated | null> {
  const result = await safeGameRequest<{ items: GameCreated[] }>(
    "GET",
    `/games?externalGameId=${encodeURIComponent(externalGameId)}`
  )
  return result?.items?.[0] ?? null
}

/**
 * Creates a "game" in GAME engine when a campaign is published.
 * POST /games
 * Body: { externalGameId, platform, strategyId, params: [{key, value}] }
 */
export async function createGameForCampaign(
  campaignId: string,
  strategy = "default",
  basicPoints = 10
): Promise<GameCreated | null> {
  const externalGameId = buildCampaignExternalGameId(campaignId)

  return safeGameRequest<GameCreated>("POST", "/games", {
    externalGameId,
    platform: "greencrowd",
    strategyId: strategy,
    params: [{ key: "variable_basic_points", value: basicPoints }],
  })
}

/**
 * Gets or creates a game for a campaign — idempotent helper.
 */
export async function getOrCreateGameForCampaign(
  campaignId: string,
  strategy = "default",
  basicPoints = 10
): Promise<GameCreated | null> {
  const externalGameId = buildCampaignExternalGameId(campaignId)
  const existing = await findGameByExternalId(externalGameId)
  if (existing) return existing
  return createGameForCampaign(campaignId, strategy, basicPoints)
}

/**
 * Registers a POI task in GAME.
 * POST /games/{gameId}/tasks
 */
export async function registerPoiTask(
  gameId: string,
  campaignId: string,
  poiId: string,
  taskId: string
): Promise<TaskCreated | null> {
  const externalTaskId = buildPoiTaskExternalTaskId(campaignId, poiId, taskId)

  return safeGameRequest<TaskCreated>("POST", `/games/${gameId}/tasks`, {
    externalTaskId,
  })
}

/**
 * Registers an open task (area-level) in GAME.
 * POST /games/{gameId}/tasks
 */
export async function registerOpenTask(
  gameId: string,
  campaignId: string,
  openTaskId: string
): Promise<TaskCreated | null> {
  const externalTaskId = buildOpenTaskExternalTaskId(campaignId, openTaskId)

  return safeGameRequest<TaskCreated>("POST", `/games/${gameId}/tasks`, {
    externalTaskId,
  })
}

// ─────────────────────────────────────────────────────────────
// GAME API — Scoring
// ─────────────────────────────────────────────────────────────

/**
 * Assigns points to a user for completing a task.
 * POST /games/{gameId}/tasks/{externalTaskId}/points
 * Body: { externalUserId, data?, isSimulated }
 */
export async function assignPoints(
  gameId: string,
  externalTaskId: string,
  externalUserId: string,
  data: Record<string, unknown> = {}
): Promise<AssignPointsResult | null> {
  const result = await safeGameRequest<AssignPointsResult>(
    "POST",
    `/games/${gameId}/tasks/${encodeURIComponent(externalTaskId)}/points`,
    { externalUserId, data, isSimulated: false }
  )

  if (result) {
    // Invalidate cached wallet so next read is fresh
    await redis.del(CACHE_KEYS.gameWallet(externalUserId, "wallet"))
  }

  return result
}

/**
 * Retrieves a user's wallet (points + coins).
 * GET /users/{externalUserId}/wallet
 * Cached 5 minutes; serves stale value if GAME is down.
 */
export async function getWallet(externalUserId: string): Promise<UserWallet | null> {
  const cacheKey = CACHE_KEYS.gameWallet(externalUserId, "wallet")

  const result = await safeGameRequest<UserWallet>(
    "GET",
    `/users/${encodeURIComponent(externalUserId)}/wallet`
  )

  if (result) {
    await redis.setex(cacheKey, 300, JSON.stringify(result))
    return result
  }

  // Stale fallback
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached) as UserWallet

  return null
}

/**
 * Retrieves all points earned by a user across all games.
 * GET /users/{externalUserId}/points
 */
export async function getUserPoints(externalUserId: string): Promise<UserPoints[] | null> {
  return safeGameRequest<UserPoints[]>(
    "GET",
    `/users/${encodeURIComponent(externalUserId)}/points`
  )
}

/**
 * Retrieves aggregated points for all users in a game.
 * GET /games/{gameId}/points
 */
export async function getGamePoints(gameId: string): Promise<UserPoints | null> {
  return safeGameRequest<UserPoints>("GET", `/games/${gameId}/points`)
}

// ─────────────────────────────────────────────────────────────
// GAME API — User actions
// ─────────────────────────────────────────────────────────────

/**
 * Tracks a user action on a task (e.g. "task_opened", "task_viewed").
 * POST /games/{gameId}/tasks/{externalTaskId}/action
 * Body: { typeAction, data, description, externalUserId } — all required by GAME
 */
export async function trackUserAction(
  gameId: string,
  externalTaskId: string,
  externalUserId: string,
  typeAction: string,
  data: Record<string, unknown> = {},
  description = typeAction
): Promise<void> {
  await safeGameRequest(
    "POST",
    `/games/${gameId}/tasks/${encodeURIComponent(externalTaskId)}/action`,
    { typeAction, data, description, externalUserId }
  )
}
