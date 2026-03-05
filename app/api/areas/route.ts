// API: POST /api/areas — crear un área en una campaña.
// Requiere role researcher o superadmin y ownership de la campaña.

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { withResearcher } from "@/middleware/auth"

const CreateAreaSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  polygonGeojson: z.object({
    type: z.literal("Polygon"),
    coordinates: z
      .array(z.array(z.tuple([z.number(), z.number()])))
      .min(1),
  }),
})

export const POST = withResearcher(async (req: NextRequest, user) => {
  const body = await req.json()
  const parsed = CreateAreaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { campaignId, name, description, polygonGeojson } = parsed.data

  // Verificar ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, researcherId: user.userId },
    select: { id: true },
  })
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found or access denied" }, { status: 404 })
  }

  // Crear área + actualizar columna GEOGRAPHY via raw SQL
  const area = await prisma.$transaction(async (tx) => {
    const newArea = await tx.area.create({
      data: {
        campaignId,
        name,
        description,
        polygonGeojson: polygonGeojson as object,
      },
    })

    // Actualizar columna PostGIS con el GeoJSON del polígono
    const geojsonStr = JSON.stringify(polygonGeojson)
    await tx.$executeRaw`
      UPDATE areas
      SET polygon = ST_GeomFromGeoJSON(${geojsonStr})::geography
      WHERE id = ${newArea.id}::uuid
    `

    return newArea
  })

  return NextResponse.json(area, { status: 201 })
})
