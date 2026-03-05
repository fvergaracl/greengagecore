// GET/PATCH/DELETE /api/campaigns/[id]
import { NextResponse } from "next/server"
import { withAuth, withResearcher, apiError } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { createGameForCampaign } from "@/domains/game/client"
import { z } from "zod"

function isValidTimezone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

const PatchCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  timezone: z.string().min(1).optional(),
  startDatetime: z.string().datetime().optional().nullable(),
  endDatetime: z.string().datetime().optional().nullable(),
  gameEnabled: z.boolean().optional(),
  gameStrategy: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const GET = withAuth(async (req, user) => {
  const id = req.nextUrl.pathname.split("/")[3]

  const campaign = await withUserRLS(user, async (tx) => {
    return tx.campaign.findUnique({
      where: { id },
      include: {
        areas: {
          include: {
            pointsOfInterest: {
              include: { tasks: true },
            },
            tasks: true,
          },
        },
        questionnaires: true,
        _count: { select: { contributions: true } },
      },
    })
  })

  if (!campaign) return apiError("Campaign not found", 404)
  return NextResponse.json(campaign)
})

export const PATCH = withResearcher(async (req, user) => {
  const id = req.nextUrl.pathname.split("/")[3]
  const body = await req.json()
  const parsed = PatchCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  if (data.timezone && !isValidTimezone(data.timezone)) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 })
  }

  const updated = await withUserRLS(user, async (tx, ctx) => {
    // Verificar ownership
    const existing = await tx.campaign.findFirst({
      where: {
        id,
        ...(ctx.userRole !== "superadmin" ? { researcherId: ctx.userId } : {}),
      },
    })
    if (!existing) throw new Error("NOT_FOUND")

    // Si se publica, crear game en GAME si está habilitado
    if (data.status === "published" && existing.status === "draft" && existing.gameEnabled) {
      const gameResult = await createGameForCampaign(id, existing.gameStrategy ?? "default")
      if (gameResult) {
        data.metadata = { ...(existing.metadata as object ?? {}), gameId: gameResult.gameId }
      }
    }

    return tx.campaign.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        timezone: data.timezone,
        gameEnabled: data.gameEnabled,
        gameStrategy: data.gameStrategy,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        startDatetime: data.startDatetime ? new Date(data.startDatetime) : data.startDatetime === null ? null : undefined,
        endDatetime: data.endDatetime ? new Date(data.endDatetime) : data.endDatetime === null ? null : undefined,
      },
    })
  }).catch((err: Error) => {
    if (err.message === "NOT_FOUND") return null
    throw err
  })

  if (!updated) return apiError("Campaign not found", 404)
  return NextResponse.json(updated)
})
