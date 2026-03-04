// API: GET/PATCH/DELETE /api/areas/[id]
// Requiere researcher con ownership de la campaña dueña del área.

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { withResearcher } from "@/middleware/auth"

type Params = { params: Promise<{ id: string }> }

async function getAreaWithOwnership(areaId: string, researcherSub: string) {
  return prisma.area.findFirst({
    where: {
      id: areaId,
      campaign: { researcherId: researcherSub },
    },
    include: {
      campaign: { select: { id: true, name: true } },
      pointsOfInterest: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { tasks: true } } },
      },
      _count: { select: { tasks: true, pointsOfInterest: true } },
    },
  })
}

export function GET(_req: NextRequest, { params }: Params) {
  return withResearcher(async (_req2, user) => {
    const { id } = await params
    const area = await getAreaWithOwnership(id, user.sub)
    if (!area) return NextResponse.json({ error: "Area not found" }, { status: 404 })
    return NextResponse.json(area)
  })(_req)
}

const PatchAreaSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  isDisabled: z.boolean().optional(),
  polygonGeojson: z
    .object({
      type: z.literal("Polygon"),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
    })
    .optional(),
})

export function PATCH(req: NextRequest, { params }: Params) {
  return withResearcher(async (req2, user) => {
    const { id } = await params
    const area = await getAreaWithOwnership(id, user.sub)
    if (!area) return NextResponse.json({ error: "Area not found" }, { status: 404 })

    const body = await req2.json()
    const parsed = PatchAreaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { polygonGeojson, ...rest } = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.area.update({
        where: { id },
        data: {
          ...rest,
          ...(polygonGeojson ? { polygonGeojson: polygonGeojson as object } : {}),
        },
      })
      if (polygonGeojson) {
        const geojsonStr = JSON.stringify(polygonGeojson)
        await tx.$executeRaw`
          UPDATE areas
          SET polygon = ST_GeomFromGeoJSON(${geojsonStr})::geography
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
    const area = await getAreaWithOwnership(id, user.sub)
    if (!area) return NextResponse.json({ error: "Area not found" }, { status: 404 })

    await prisma.area.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  })(req)
}
