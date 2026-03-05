// GET /api/game/status — resumen del dashboard GAME + lista de estrategias
// Solo accesible para usuarios autenticados (researcher o superadmin)
import { NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"

const GAME_BASE_URL = process.env.API_GAME_BASE_URL
const GAME_API_KEY = process.env.API_GAME_APIKEY

async function gameGet<T>(path: string): Promise<T | null> {
  if (!GAME_BASE_URL || !GAME_API_KEY) return null
  try {
    const res = await fetch(`${GAME_BASE_URL}${path}`, {
      headers: { "x-api-key": GAME_API_KEY },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

export type DashboardSummaryElement = { label: string; count: number }
export type DashboardSummary = {
  new_users: DashboardSummaryElement[]
  games_opened: DashboardSummaryElement[]
  points_earned: DashboardSummaryElement[]
  actions_performed: DashboardSummaryElement[]
}

export type Strategy = {
  id: string
  name?: string
  description?: string
  version: string
  variables: Record<string, number>
}

export const GET = withAuth(async () => {
  const [summary, strategies] = await Promise.all([
    gameGet<DashboardSummary>("/dashboard/summary"),
    gameGet<Strategy[]>("/strategies"),
  ])

  return NextResponse.json({ summary, strategies })
})
