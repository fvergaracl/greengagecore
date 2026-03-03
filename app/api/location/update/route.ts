// POST /api/location/update — Recibe posición del usuario (foreground)
// Server-side geofencing para OpenTasks → push notification si entra en área.
import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { getAreasWithOpenTasksAt } from "@/domains/geo/geofence"
import { pushQueue } from "@/workers/index"
import { redis } from "@/lib/redis"
import { z } from "zod"

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  timestamp: z.number().optional(),
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const parsed = LocationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { latitude, longitude, accuracy } = parsed.data
  const position = { latitude, longitude }

  const [userId] = await withUserRLS(user, async (tx, ctx) => {
    // Guardar telemetría de posición
    await tx.telemetryEvent.create({
      data: {
        userId: ctx.userId,
        eventType: "position_update",
        latitude,
        longitude,
        payload: { accuracy },
      },
    })
    return [ctx.userId]
  })

  // Verificar si el usuario está en un área con OpenTasks
  // Throttle: no notificar más de 1 vez por área por hora
  const areas = await getAreasWithOpenTasksAt(position, userId)

  for (const area of areas) {
    const throttleKey = `notif:area:${userId}:${area.areaId}`
    const alreadyNotified = await redis.get(throttleKey)

    if (!alreadyNotified) {
      await pushQueue.add("area-entry-notification", {
        userId,
        title: "New tasks available nearby",
        body: `You are near area: ${area.areaName}. ${area.openTaskCount} task(s) available.`,
        data: { areaId: area.areaId, campaignId: area.campaignId },
      })

      // Throttle: 1 hora
      await redis.setex(throttleKey, 3600, "1")
    }
  }

  return NextResponse.json({ ok: true, areasDetected: areas.length })
})
