// GET /api/game/games/[gameId]/leaderboard — ranking de usuarios por puntos en un juego
import { NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"

const GAME_BASE_URL = process.env.API_GAME_BASE_URL
const GAME_API_KEY = process.env.API_GAME_APIKEY

type PointsAssignedToUserDetails = {
  externalUserId?: string
  points?: number
  timesAwarded?: number
  caseName?: string
  [key: string]: unknown
}

type TaskPointsByGameWithDetails = {
  externalTaskId: string
  points: PointsAssignedToUserDetails[]
}

type AllPointsByGameWithDetails = {
  externalGameId: string
  created_at: string
  task: TaskPointsByGameWithDetails[]
}

export const GET = withAuth(async (req, _user) => {
  // /api/game/games/{gameId}/leaderboard → index 4
  const gameId = req.nextUrl.pathname.split("/")[4]

  if (!GAME_BASE_URL || !GAME_API_KEY) {
    return NextResponse.json({ error: "GAME not configured" }, { status: 503 })
  }

  try {
    const res = await fetch(`${GAME_BASE_URL}/games/${gameId}/points/details`, {
      headers: { "x-api-key": GAME_API_KEY },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json({ error: `GAME error ${res.status}` }, { status: res.status })
    }

    const data = (await res.json()) as AllPointsByGameWithDetails

    // Agregar puntos por usuario a través de todas las tareas
    const userTotals = new Map<string, number>()

    for (const task of data.task ?? []) {
      for (const entry of task.points ?? []) {
        if (!entry.externalUserId) continue
        const current = userTotals.get(entry.externalUserId) ?? 0
        userTotals.set(entry.externalUserId, current + (entry.points ?? 0))
      }
    }

    const leaderboard = Array.from(userTotals.entries())
      .map(([externalUserId, totalPoints]) => ({ externalUserId, totalPoints }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 50)

    return NextResponse.json({ gameId, leaderboard, taskBreakdown: data.task })
  } catch {
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 503 })
  }
})
