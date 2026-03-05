// API: GET/PATCH/DELETE /api/questionnaires/[id]

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { withResearcher } from "@/middleware/auth"

type Params = { params: Promise<{ id: string }> }

async function getQuestionnaire(id: string, researcherSub: string) {
  return prisma.questionnaire.findFirst({
    where: { id, campaign: { researcherId: researcherSub } },
    include: { _count: { select: { responses: true } } },
  })
}

export function GET(req: NextRequest, { params }: Params) {
  return withResearcher(async (_req2, user) => {
    const { id } = await params
    const q = await getQuestionnaire(id, user.userId)
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(q)
  })(req)
}

const PatchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  condition: z.enum(["before", "after", "daily", "every_x_days"]).optional(),
  frequencyInDays: z.number().int().min(1).nullable().optional(),
})

export function PATCH(req: NextRequest, { params }: Params) {
  return withResearcher(async (req2, user) => {
    const { id } = await params
    const q = await getQuestionnaire(id, user.userId)
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = await req2.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const updated = await prisma.questionnaire.update({ where: { id }, data: parsed.data })
    return NextResponse.json(updated)
  })(req)
}

export function DELETE(req: NextRequest, { params }: Params) {
  return withResearcher(async (_req2, user) => {
    const { id } = await params
    const q = await getQuestionnaire(id, user.userId)
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.questionnaire.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  })(req)
}
