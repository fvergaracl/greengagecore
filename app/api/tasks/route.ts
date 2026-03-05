// POST /api/tasks — Crea una nueva task vinculada a un POI.
// Solo researchers/admins pueden crear tasks.

import { NextResponse } from "next/server"
import { withResearcher } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { z } from "zod"

// Tasks are linked to a PointOfInterest.
// Ownership is verified via poi.area.campaign.researcherId.

const TaskSchema = z.object({
  poiId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["photo", "survey", "mixed", "instruction"]),
  taskData: z.record(z.unknown()).default({}),
  requiresPhoto: z.boolean().default(false),
  requiresSurvey: z.boolean().default(false),
  responseLimit: z.number().int().positive().optional(),
  responseLimitInterval: z.number().int().positive().optional(),
  closureMode: z.enum(["single", "threshold", "unlimited"]).default("unlimited"),
})

export const POST = withResearcher(async (req, user) => {
  const body = await req.json()
  const parsed = TaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const hasTaskSchema = Object.keys(data.taskData ?? {}).length > 0

  if ((data.type === "survey" || data.type === "mixed") && !hasTaskSchema) {
    return NextResponse.json(
      { error: "Survey and mixed tasks require a SurveyJS schema in taskData" },
      { status: 400 }
    )
  }

  const requiresPhoto = data.requiresPhoto || data.type === "photo" || data.type === "mixed"
  const requiresSurvey = data.requiresSurvey || data.type === "survey" || data.type === "mixed"

  const task = await withUserRLS(user, async (tx) => {
    // Verify researcher owns the campaign through the POI.
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
      },
    })
  })

  return NextResponse.json({ task }, { status: 201 })
})
