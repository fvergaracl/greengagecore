// GET /api/game/games — lista de juegos GAME cruzada con campañas de la DB
// Devuelve los juegos que el usuario puede ver, enriquecidos con datos de campaña
import { NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { buildCampaignExternalGameId } from "@/domains/game/external-ids"
import { ROLES } from "@/lib/auth"

const GAME_BASE_URL = process.env.API_GAME_BASE_URL
const GAME_API_KEY = process.env.API_GAME_APIKEY

type BaseGameResult = {
  gameId: string
  externalGameId: string
  strategyId?: string
  platform?: string
  created_at?: string
  updated_at?: string
  params?: Array<{ key: string; value: string | number | boolean }>
}

async function fetchGameByExternalId(externalId: string): Promise<BaseGameResult | null> {
  if (!GAME_BASE_URL || !GAME_API_KEY) return null
  try {
    const res = await fetch(
      `${GAME_BASE_URL}/games?externalGameId=${encodeURIComponent(externalId)}`,
      {
        headers: { "x-api-key": GAME_API_KEY },
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { items?: BaseGameResult[] }
    return data.items?.[0] ?? null
  } catch {
    return null
  }
}

export const GET = withAuth(async (req, user) => {
  const isSuperAdmin = user.roles.includes(ROLES.SUPERADMIN)

  // Obtener campañas con gameEnabled desde nuestra DB
  const campaigns = await withUserRLS(user, async (tx, ctx) => {
    return tx.campaign.findMany({
      where: {
        ...(ctx.userRole !== "superadmin" ? { researcherId: ctx.userId } : {}),
        gameEnabled: true,
        isDisabled: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        gameStrategy: true,
        createdAt: true,
        _count: { select: { contributions: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  })

  // Para cada campaña publicada, intentar resolver el game en GAME engine
  const games = await Promise.all(
    campaigns.map(async (c) => {
      const externalGameId = buildCampaignExternalGameId(c.id)
      const gameData = c.status === "published" ? await fetchGameByExternalId(externalGameId) : null

      return {
        campaignId: c.id,
        campaignName: c.name,
        campaignStatus: c.status,
        gameStrategy: c.gameStrategy,
        contributionCount: c._count.contributions,
        externalGameId,
        game: gameData,
      }
    })
  )

  return NextResponse.json({ games, isSuperAdmin })
})
