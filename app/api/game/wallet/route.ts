// GET /api/game/wallet?campaignId=... — Wallet del usuario en una campaña
import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { getWallet } from "@/domains/game/client"
import { z } from "zod"

const QuerySchema = z.object({ campaignId: z.string().uuid() })

export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url)
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 })
  }

  const { campaignId } = parsed.data

  const { campaign, wallet, userId } = await withUserRLS(user, async (tx, ctx) => {
    const campaign = await tx.campaign.findFirst({
      where: { id: campaignId, isDisabled: false },
      select: { gameId: true, gameEnabled: true },
    })
    const wallet = await tx.userWallet.findUnique({
      where: { userId_campaignId: { userId: ctx.userId, campaignId } },
    })
    return { campaign, wallet, userId: ctx.userId }
  })

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  // Si GAME está habilitado, intentar obtener wallet actualizado
  let gameWallet: { totalPoints: number; rank?: number } | null = null
  if (campaign.gameEnabled && campaign.gameId) {
    gameWallet = await getWallet(campaign.gameId, user.sub, campaignId)
  }

  return NextResponse.json({
    campaignId,
    totalPoints: gameWallet?.totalPoints ?? wallet?.totalPoints ?? 0,
    rank: gameWallet?.rank,
    lastSyncedAt: wallet?.lastSyncedAt,
    isStale: !gameWallet && !!wallet, // stale si viene de cache local
  })
})
