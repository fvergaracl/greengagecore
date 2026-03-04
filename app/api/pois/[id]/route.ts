// API: PATCH/DELETE /api/pois/[id]
// Requiere researcher con ownership del área padre.

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { withResearcher } from "@/middleware/auth"

type Params = { params: Promise<{ id: string }> }

async function getPoiWithOwnership(poiId: string, researcherSub: string) {
  return prisma.pointOfInterest.findFirst({
    where: {
      id: poiId,
      area: { campaign: { researcherId: researcherSub } },
    },
    include: {
      area: { select: { id: true, campaignId: true } },
      _count: { select: { tasks: true } },
    },
  })
}

const PatchPoiSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().min(1).max(500).optional(),
  isDisabled: z.boolean().optional(),
})

export function PATCH(req: NextRequest, { params }: Params) {
  return withResearcher(async (req2, user) => {
    const { id } = await params
    const poi = await getPoiWithOwnership(id, user.sub)
    if (!poi) return NextResponse.json({ error: "POI not found" }, { status: 404 })

    const body = await req2.json()
    const parsed = PatchPoiSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { latitude, longitude, ...rest } = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.pointOfInterest.update({
        where: { id },
        data: {
          ...rest,
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {}),
        },
      })

      // Actualizar PostGIS si cambian coordenadas
      if (latitude !== undefined || longitude !== undefined) {
        const lat = latitude ?? u.latitude
        const lng = longitude ?? u.longitude
        await tx.$executeRaw`
          UPDATE points_of_interest
          SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          WHERE id = ${id}::uuid
        `
      }

      return u
    })

    return NextResponse.json(updated)
  })(req)
}

export function DELETE(req: NextRequest, { params }: Params) {
  return withResearcher(async (_req2, user) => {
    const { id } = await params
    const poi = await getPoiWithOwnership(id, user.sub)
    if (!poi) return NextResponse.json({ error: "POI not found" }, { status: 404 })

    await prisma.pointOfInterest.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  })(req)
}
