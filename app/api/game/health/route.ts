// GET /api/game/health — comprueba si el motor GAME está operativo
import { NextResponse } from "next/server"

const GAME_BASE_URL = process.env.API_GAME_BASE_URL
const GAME_API_KEY = process.env.API_GAME_APIKEY

export async function GET() {
  if (!GAME_BASE_URL || !GAME_API_KEY) {
    return NextResponse.json({ online: false, reason: "not_configured" })
  }

  try {
    const res = await fetch(`${GAME_BASE_URL}/kpi/health_check`, {
      headers: { "x-api-key": GAME_API_KEY },
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    })
    if (res.ok) {
      return NextResponse.json({ online: true })
    }
    return NextResponse.json({ online: false, reason: `status_${res.status}` })
  } catch {
    return NextResponse.json({ online: false, reason: "unreachable" })
  }
}
