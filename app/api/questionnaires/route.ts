// API: GET/POST /api/questionnaires
// GET: lista cuestionarios de una campaña (?campaignId=)
// POST: crea nuevo cuestionario — acepta schema SurveyJS raw (researcher + ownership)

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { withResearcher } from "@/middleware/auth"

const CreateSchema = z.object({
  campaignId: z.string().uuid(),
  title: z.string().min(2).max(200),
  condition: z.enum(["before", "after", "daily", "every_x_days"]),
  frequencyInDays: z.number().int().min(1).optional(),
  schema: z.record(z.unknown()), // Schema SurveyJS completo generado por el Creator
})

export const GET = withResearcher(async (req: NextRequest, user) => {
  const { searchParams } = req.nextUrl
  const campaignId = searchParams.get("campaignId")
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 })
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, researcherId: user.userId },
    select: { id: true },
  })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  const questionnaires = await prisma.questionnaire.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true } } },
  })

  return NextResponse.json(questionnaires)
})

export const POST = withResearcher(async (req: NextRequest, user) => {
  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { campaignId, title, condition, frequencyInDays, schema } = parsed.data

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, researcherId: user.userId },
    select: { id: true },
  })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  const questionnaire = await prisma.questionnaire.create({
    data: {
      campaignId,
      title,
      condition,
      frequencyInDays: condition === "every_x_days" ? (frequencyInDays ?? null) : null,
      schema: schema as object,
    },
  })

  return NextResponse.json(questionnaire, { status: 201 })
})
