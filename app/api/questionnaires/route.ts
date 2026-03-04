// API: GET/POST /api/questionnaires
// GET: lista cuestionarios de una campaña (?campaignId=)
// POST: crea nuevo cuestionario (researcher + ownership)

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { withResearcher } from "@/middleware/auth"

const QuestionSchema = z.object({
  name: z.string().min(1),           // ID interno (snake_case)
  title: z.string().min(1),          // Label visible
  type: z.enum(["text", "number", "boolean", "select", "multiselect", "range", "photo"]),
  required: z.boolean().default(false),
  choices: z.array(z.string()).optional(), // para select/multiselect
  min: z.number().optional(),             // para range/number
  max: z.number().optional(),
  placeholder: z.string().optional(),
})

const CreateSchema = z.object({
  campaignId: z.string().uuid(),
  title: z.string().min(2).max(200),
  condition: z.enum(["before", "after", "daily", "every_x_days"]),
  frequencyInDays: z.number().int().min(1).optional(),
  questions: z.array(QuestionSchema).min(1).max(50),
})

export const GET = withResearcher(async (req: NextRequest, user) => {
  const { searchParams } = req.nextUrl
  const campaignId = searchParams.get("campaignId")
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 })
  }

  // Verificar ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, researcherId: user.sub },
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

  const { campaignId, title, condition, frequencyInDays, questions } = parsed.data

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, researcherId: user.sub },
    select: { id: true },
  })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  // Construir schema SurveyJS-compatible
  const surveySchema = {
    title,
    pages: [
      {
        name: "page1",
        elements: questions.map((q) => buildSurveyJsElement(q)),
      },
    ],
    showProgressBar: "bottom",
    completeText: "Submit",
  }

  const questionnaire = await prisma.questionnaire.create({
    data: {
      campaignId,
      title,
      condition,
      frequencyInDays: condition === "every_x_days" ? frequencyInDays : null,
      schema: surveySchema as object,
    },
  })

  return NextResponse.json(questionnaire, { status: 201 })
})

function buildSurveyJsElement(q: z.infer<typeof QuestionSchema>): object {
  const base = {
    name: q.name,
    title: q.title,
    isRequired: q.required,
  }

  switch (q.type) {
    case "text":
      return { ...base, type: "text", inputType: "text", placeholder: q.placeholder }
    case "number":
      return { ...base, type: "text", inputType: "number", min: q.min, max: q.max }
    case "boolean":
      return { ...base, type: "boolean" }
    case "select":
      return { ...base, type: "dropdown", choices: q.choices ?? [] }
    case "multiselect":
      return { ...base, type: "checkbox", choices: q.choices ?? [] }
    case "range":
      return { ...base, type: "rating", rateMin: q.min ?? 1, rateMax: q.max ?? 5 }
    case "photo":
      return { ...base, type: "file", storeDataAsText: false, allowImagesPreview: true, maxSize: 5242880 }
    default:
      return { ...base, type: "text" }
  }
}
