// GET /api/game/status — resumen del dashboard GAME + lista de estrategias
// Solo accesible para usuarios autenticados (researcher o superadmin)
import { NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"

const GAME_BASE_URL = process.env.API_GAME_BASE_URL
const GAME_API_KEY = process.env.API_GAME_APIKEY

type GameFetchResult<T> = {
  data: T | null
  error: string | null
}

async function gameGet<T>(path: string): Promise<GameFetchResult<T>> {
  if (!GAME_BASE_URL || !GAME_API_KEY) {
    return { data: null, error: "not_configured" }
  }

  try {
    const res = await fetch(`${GAME_BASE_URL}${path}`, {
      headers: { "x-api-key": GAME_API_KEY },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    })
    if (!res.ok) {
      return { data: null, error: `status_${res.status}` }
    }
    return { data: await res.json() as T, error: null }
  } catch {
    return { data: null, error: "unreachable" }
  }
}

export type DashboardSummaryElement = { label: string; count: number }
export type DashboardSummary = {
  new_users: DashboardSummaryElement[]
  games_opened: DashboardSummaryElement[]
  points_earned: DashboardSummaryElement[]
  actions_performed: DashboardSummaryElement[]
}

type StrategyVariableValue =
  | string
  | number
  | boolean
  | null
  | Record<string, StrategyVariableValue>
  | StrategyVariableValue[]

export type Strategy = {
  id: string
  name?: string
  description?: string
  version: string
  variables: Record<string, StrategyVariableValue>
}

export const GET = withAuth(async () => {
  const [summaryResult, strategiesResult] = await Promise.all([
    gameGet<DashboardSummary>("/dashboard/summary"),
    gameGet<Strategy[]>("/strategies"),
  ])

  return NextResponse.json({
    summary: summaryResult.data,
    strategies: strategiesResult.data,
    summaryError: summaryResult.error,
    strategiesError: strategiesResult.error,
  })
})
