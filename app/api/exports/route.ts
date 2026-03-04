// POST /api/exports — Encola un job de exportación asíncrona.
// Requiere rol researcher. El resultado (URL firmada) se envía por push.

import { NextResponse } from "next/server"
import { withResearcher } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { exportQueue } from "@/workers/index"
import { z } from "zod"

const ExportRequestSchema = z.object({
  campaignId: z.string().uuid(),
  format: z.enum(["csv", "geojson"]),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

export const POST = withResearcher(async (req, user) => {
  const body = await req.json()
  const parsed = ExportRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { campaignId, format, dateFrom, dateTo } = parsed.data

  // Verificar que la campaña pertenece al researcher
  await withUserRLS(user, async (tx) => {
    const campaign = await tx.campaign.findFirst({
      where: { id: campaignId, researcherId: user.userId },
    })
    if (!campaign) {
      throw Object.assign(new Error("CAMPAIGN_NOT_FOUND"), { status: 404 })
    }
  })

  const job = await exportQueue.add("export", {
    campaignId,
    requestedBy: user.userId,
    format,
    filters: {
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
    },
  })

  return NextResponse.json({ jobId: job.id, status: "queued" }, { status: 202 })
})
