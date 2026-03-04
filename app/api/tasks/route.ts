// POST /api/tasks — Crea una nueva task para una campaña existente.
// Solo researchers/admins pueden crear tasks.

import { NextResponse } from "next/server"
import { withResearcher } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { z } from "zod"

// Tasks are linked to either an Area or a PointOfInterest (XOR), never directly to Campaign.
// Ownership is verified via area.campaign.researcherId or poi.area.campaign.researcherId.

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
})

export const POST = withResearcher(async (req, user) => {
  const body = await req.json()
  const parsed = TaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  if (!data.poiId && !data.areaId) {
    return NextResponse.json(
      { error: "Either poiId or areaId is required" },
      { status: 400 }
    )
  }
  if (data.poiId && data.areaId) {
    return NextResponse.json(
      { error: "Only one of poiId or areaId is allowed" },
      { status: 400 }
    )
  }

  const task = await withUserRLS(user, async (tx) => {
    // Verify researcher owns the campaign via area or POI
    if (data.areaId) {
      const area = await tx.area.findFirst({
        where: { id: data.areaId, campaign: { researcherId: user.userId } },
      })
      if (!area) throw Object.assign(new Error("AREA_NOT_FOUND"), { status: 404 })
    } else if (data.poiId) {
      const poi = await tx.pointOfInterest.findFirst({
        where: { id: data.poiId, area: { campaign: { researcherId: user.userId } } },
      })
      if (!poi) throw Object.assign(new Error("POI_NOT_FOUND"), { status: 404 })
    }

    return tx.task.create({
      data: {
        poiId: data.poiId ?? null,
        areaId: data.areaId ?? null,
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        taskData: data.taskData as object,
        requiresPhoto: data.requiresPhoto,
        requiresSurvey: data.requiresSurvey,
        responseLimit: data.responseLimit ?? null,
        responseLimitInterval: data.responseLimitInterval ?? null,
        closureMode: data.closureMode,
      },
    })
  })

  return NextResponse.json({ task }, { status: 201 })
})
