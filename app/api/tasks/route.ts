// POST /api/tasks — Crea una task vinculada a un POI o como open task de área.
// Solo researchers/admins pueden crear tasks.

import { NextResponse } from "next/server"
import { withResearcher } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { z } from "zod"

// Tasks target exactly one location scope:
// - POI task: poiId set, areaId null
// - Open task: areaId set, poiId null

const TaskSchema = z.object({
  poiId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["photo", "survey", "mixed", "instruction"]),
  taskData: z.record(z.unknown()).default({}),
  requiresPhoto: z.boolean().default(false),
  requiresSurvey: z.boolean().default(false),
  responseLimit: z.number().int().positive().optional(),
  responseLimitInterval: z.number().int().positive().optional(),
  closureMode: z.enum(["single", "threshold", "unlimited"]).default("unlimited"),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
})

export const POST = withResearcher(async (req, user) => {
  const body = await req.json()
  const parsed = TaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  if (!!data.poiId === !!data.areaId) {
    return NextResponse.json(
      { error: "Define exactly one target: poiId or areaId" },
      { status: 400 }
    )
  }
  const hasTaskSchema = Object.keys(data.taskData ?? {}).length > 0

  if ((data.type === "survey" || data.type === "mixed") && !hasTaskSchema) {
    return NextResponse.json(
      { error: "Survey and mixed tasks require a SurveyJS schema in taskData" },
      { status: 400 }
    )
  }

  const availableFrom = data.availableFrom ? new Date(data.availableFrom) : null
  const availableTo = data.availableTo ? new Date(data.availableTo) : null

  if (availableFrom && Number.isNaN(availableFrom.getTime())) {
    return NextResponse.json({ error: "Invalid availableFrom datetime" }, { status: 400 })
  }
  if (availableTo && Number.isNaN(availableTo.getTime())) {
    return NextResponse.json({ error: "Invalid availableTo datetime" }, { status: 400 })
  }
  if (availableFrom && availableTo && availableFrom > availableTo) {
    return NextResponse.json(
      { error: "availableFrom must be before or equal to availableTo" },
      { status: 400 }
    )
  }

  const requiresPhoto = data.requiresPhoto || data.type === "photo" || data.type === "mixed"
  const requiresSurvey = data.requiresSurvey || data.type === "survey" || data.type === "mixed"

  const task = await withUserRLS(user, async (tx) => {
    if (data.poiId) {
      // POI task: verify researcher owns the campaign through the POI.
      const poi = await tx.pointOfInterest.findFirst({
        where: { id: data.poiId, area: { campaign: { researcherId: user.userId } } },
      })
      if (!poi) throw Object.assign(new Error("POI_NOT_FOUND"), { status: 404 })

      return tx.task.create({
        data: {
          poiId: data.poiId,
          areaId: null,
          title: data.title,
          description: data.description ?? null,
          type: data.type,
          taskData: data.taskData as object,
          requiresPhoto,
          requiresSurvey,
          responseLimit: data.responseLimit ?? null,
          responseLimitInterval: data.responseLimitInterval ?? null,
          closureMode: data.closureMode,
          availableFrom,
          availableTo,
        },
      })
    }

    // Open task (area-level): verify ownership via area -> campaign.
    const area = await tx.area.findFirst({
      where: { id: data.areaId!, campaign: { researcherId: user.userId } },
    })
    if (!area) throw Object.assign(new Error("AREA_NOT_FOUND"), { status: 404 })

    return tx.task.create({
      data: {
        poiId: null,
        areaId: area.id,
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        taskData: data.taskData as object,
        requiresPhoto,
        requiresSurvey,
        responseLimit: data.responseLimit ?? null,
        responseLimitInterval: data.responseLimitInterval ?? null,
        closureMode: data.closureMode,
        availableFrom,
        availableTo,
      },
    })
  }).catch((err: Error) => {
    if (err.message === "POI_NOT_FOUND" || err.message === "AREA_NOT_FOUND") {
      return null
    }
    throw err
  })

  if (!task) {
    return NextResponse.json(
      { error: data.poiId ? "POI not found" : "Area not found" },
      { status: 404 }
    )
  }

  return NextResponse.json({ task }, { status: 201 })
})
