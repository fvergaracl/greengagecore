// API: POST /api/pois — crear un POI en un área.
// Requiere researcher + ownership del área.

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { withResearcher } from "@/middleware/auth"

const CreatePoiSchema = z.object({
  areaId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().min(1).max(500).default(15),
})

export const POST = withResearcher(async (req: NextRequest, user) => {
  const body = await req.json()
  const parsed = CreatePoiSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { areaId, name, description, latitude, longitude, radiusMeters } = parsed.data

  // Verificar ownership: área → campaña → researcher
  const area = await prisma.area.findFirst({
    where: { id: areaId, campaign: { researcherId: user.sub } },
    select: { id: true },
  })
  if (!area) {
    return NextResponse.json({ error: "Area not found or access denied" }, { status: 404 })
  }

  const poi = await prisma.$transaction(async (tx) => {
    const newPoi = await tx.pointOfInterest.create({
      data: { areaId, name, description, latitude, longitude, radiusMeters },
    })

    // Actualizar columna PostGIS location GEOGRAPHY(POINT)
    await tx.$executeRaw`
      UPDATE points_of_interest
      SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      WHERE id = ${newPoi.id}::uuid
    `

    return newPoi
  })

  return NextResponse.json(poi, { status: 201 })
})
