// GET /api/tasks/nearby — Tasks visibles cerca de la posición del usuario
import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { getNearbyTasks, getAreasWithOpenTasksAt } from "@/domains/geo/geofence"
import { z } from "zod"

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(5000).default(500),
})

export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url)
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { lat, lng, radius } = parsed.data
  const position = { latitude: lat, longitude: lng }

  const [userId] = await withUserRLS(user, async (_, ctx) => [ctx.userId])

  const [nearbyTasks, areasWithOpenTasks] = await Promise.all([
    getNearbyTasks(position, userId, radius),
    getAreasWithOpenTasksAt(position, userId),
  ])

  return NextResponse.json({
    tasks: nearbyTasks,
    openTaskAreas: areasWithOpenTasks,
    position,
  })
})
