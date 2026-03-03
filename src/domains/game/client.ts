// GreenCrowd V2 — GAME Engine client with Circuit Breaker
// Implements: game creation, task registration, simulation and point assignment.
import CircuitBreaker from "opossum"
import { redis, CACHE_KEYS } from "@/lib/redis"
import { buildCampaignExternalGameId, buildPoiTaskExternalTaskId, buildOpenTaskExternalTaskId } from "./external-ids"

const GAME_BASE_URL = process.env.API_GAME_BASE_URL
const GAME_API_KEY = process.env.API_GAME_APIKEY

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type GameDimensions = {
  DIM_BP: number
  DIM_LBE: number
  DIM_TD: number
  DIM_PP: number
  DIM_S: number
}

export type SimulatedPoints = {
  externalUserId: string
  externalTaskId: string
  dimensions: { [key: string]: number }[]
  totalSimulatedPoints: number
  expirationDate: string
  simulationHash: string
}

export type AssignPointsResult = {
  points: number
  caseName: string
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
      "X-API-Key": GAME_API_KEY,
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
// Envuelve todas las llamadas a GAME
// ─────────────────────────────────────────────────────────────

const breakerOptions = {
  timeout: 10_000,       // 10 segundos
  errorThresholdPercentage: 50,  // Abre si 50% de requests fallan
  resetTimeout: 30_000,  // Intenta re-conectar cada 30s
  volumeThreshold: 3,    // Mínimo 3 requests antes de evaluar
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
 * Crea un "game" en GAME engine al publicar una campaña.
 * Idempotente: si ya existe, retorna el existente.
 */
export async function createGameForCampaign(
  campaignId: string,
  strategy = "greencrowdStrategy",
  basicPoints = 10
): Promise<{ id: string; externalGameId: string } | null> {
  const externalGameId = buildCampaignExternalGameId(campaignId)

  return safeGameRequest<{ id: string; externalGameId: string }>(
    "POST",
    "/games",
    {
      externalGameId,
      params: { strategyId: strategy, basicPoints },
    }
  )
}

/**
 * Registra un task POI en GAME.
 */
export async function registerPoiTask(
  gameId: string,
  campaignId: string,
  poiId: string,
  taskId: string
): Promise<{ id: string; externalTaskId: string } | null> {
  const externalTaskId = buildPoiTaskExternalTaskId(campaignId, poiId, taskId)

  return safeGameRequest<{ id: string; externalTaskId: string }>(
    "POST",
    `/games/${gameId}/tasks`,
    { externalTaskId, params: {} }
  )
}

/**
 * Registra un OpenTask (area-level) en GAME.
 */
export async function registerOpenTask(
  gameId: string,
  campaignId: string,
  openTaskId: string
): Promise<{ id: string; externalTaskId: string } | null> {
  const externalTaskId = buildOpenTaskExternalTaskId(campaignId, openTaskId)

  return safeGameRequest<{ id: string; externalTaskId: string }>(
    "POST",
    `/games/${gameId}/tasks`,
    { externalTaskId, params: {} }
  )
}

// ─────────────────────────────────────────────────────────────
// GAME API — Scoring
// ─────────────────────────────────────────────────────────────

/**
 * Simula los puntos que recibiría el usuario al completar la task.
 * Resultado cacheado en Redis hasta la expirationDate.
 */
export async function simulatePoints(
  gameId: string,
  externalUserId: string,
  externalTaskId: string
): Promise<SimulatedPoints | null> {
  const cacheKey = CACHE_KEYS.gameSimulate(externalUserId, externalTaskId)

  // Intentar cache primero
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached) as SimulatedPoints
  }

  const result = await safeGameRequest<SimulatedPoints>(
    "GET",
    `/games/${gameId}/points/simulated?externalUserId=${encodeURIComponent(externalUserId)}&externalTaskId=${encodeURIComponent(externalTaskId)}`
  )

  if (result) {
    // Cachear hasta la expiración que indica GAME
    const expiresAt = new Date(result.expirationDate).getTime()
    const ttlMs = Math.max(0, expiresAt - Date.now())
    if (ttlMs > 0) {
      await redis.setex(cacheKey, Math.floor(ttlMs / 1000), JSON.stringify(result))
    }
  }

  return result
}

/**
 * Asigna los puntos al usuario al completar una task.
 * Usa el simulationHash para validar que la simulación no expiró.
 */
export async function assignPoints(
  gameId: string,
  gameTaskId: string,
  externalUserId: string,
  simulatedData: { simulationHash: string; tasks: SimulatedPoints[] }
): Promise<AssignPointsResult | null> {
  const result = await safeGameRequest<AssignPointsResult>(
    "POST",
    `/games/${gameId}/tasks/${gameTaskId}/points`,
    {
      externalUserId,
      data: simulatedData,
    }
  )

  if (result) {
    // Invalidar cache de wallet y ranking
    const [walletKey] = [
      CACHE_KEYS.gameWallet(externalUserId, "*"),
    ]
    await redis.del(walletKey)
  }

  return result
}

/**
 * Obtiene el wallet (puntos totales) del usuario en una campaña.
 * Cacheado 5 minutos; sirve stale si GAME está caído.
 */
export async function getWallet(
  gameId: string,
  externalUserId: string,
  campaignId: string
): Promise<{ totalPoints: number; rank?: number } | null> {
  const cacheKey = CACHE_KEYS.gameWallet(externalUserId, campaignId)

  // Intentar desde cache (sirve stale si GAME caído)
  const cached = await redis.get(cacheKey)

  const result = await safeGameRequest<{ totalPoints: number; rank?: number }>(
    "GET",
    `/games/${gameId}/points?externalUserId=${encodeURIComponent(externalUserId)}`
  )

  if (result) {
    await redis.setex(cacheKey, 300, JSON.stringify(result)) // TTL 5 min
    return result
  }

  // Fallback: devolver valor cacheado aunque esté expirado (stale)
  if (cached) {
    return JSON.parse(cached) as { totalPoints: number }
  }

  return null
}

/**
 * Trackea una acción del usuario (e.g., task_opened) en GAME.
 */
export async function trackUserAction(
  gameId: string,
  gameTaskId: string,
  externalUserId: string,
  action: string
): Promise<void> {
  await safeGameRequest(
    "POST",
    `/games/${gameId}/tasks/${gameTaskId}/action`,
    { externalUserId, action }
  )
}
