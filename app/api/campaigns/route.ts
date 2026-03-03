// GET /api/campaigns — lista campañas del researcher autenticado
// POST /api/campaigns — crea nueva campaña
import { NextRequest, NextResponse } from "next/server"
import { withAuth, withResearcher } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { z } from "zod"
import { createGameForCampaign } from "@/domains/game/client"

const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().min(1),
  groupName: z.string().optional(),
  startDatetime: z.string().datetime().optional(),
  endDatetime: z.string().datetime().optional(),
  gameEnabled: z.boolean().default(false),
  gameStrategy: z.string().default("greencrowdStrategy"),
})

export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = parseInt(searchParams.get("limit") ?? "20", 10)

  const campaigns = await withUserRLS(user, async (tx, ctx) => {
    return tx.campaign.findMany({
      where: {
        ...(ctx.userRole !== "superadmin" ? { researcherId: ctx.userId } : {}),
        ...(status ? { status: status as "draft" | "published" | "archived" } : {}),
        isDisabled: false,
      },
      include: {
        areas: { select: { id: true, name: true } },
        _count: { select: { contributions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })
  })

  return NextResponse.json({ campaigns, page, limit })
})

export const POST = withResearcher(async (req, user) => {
  const body = await req.json()
  const parsed = CreateCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  const campaign = await withUserRLS(user, async (tx, ctx) => {
    return tx.campaign.create({
      data: {
        researcherId: ctx.userId,
        name: data.name,
        description: data.description,
        category: data.category,
        groupName: data.groupName,
        startDatetime: data.startDatetime ? new Date(data.startDatetime) : undefined,
        endDatetime: data.endDatetime ? new Date(data.endDatetime) : undefined,
        gameEnabled: data.gameEnabled,
        gameStrategy: data.gameStrategy,
        status: "draft",
      },
    })
  })

  return NextResponse.json(campaign, { status: 201 })
})
