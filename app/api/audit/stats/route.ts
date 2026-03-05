// API: GET /api/audit/stats — estadísticas agregadas para las gráficas (superadmin only).
// Mismos filtros que /api/audit: entityType, action, from, to

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withSuperAdmin } from "@/middleware/auth"
import { Prisma } from "@prisma/client"
import type { AuditAction } from "@prisma/client"

export const GET = withSuperAdmin(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl
  const entityType = searchParams.get("entityType") ?? undefined
  const action = searchParams.get("action") as AuditAction | null
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  // Default: últimos 30 días si no hay rango
  const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const dateTo = to ? new Date(to + "T23:59:59.999Z") : new Date()

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
    createdAt: { gte: dateFrom, lte: dateTo },
  }

  // Build optional SQL fragments
  const entityFilter = entityType ? Prisma.sql`AND entity_type = ${entityType}` : Prisma.sql``
  const actionFilter = action
    ? Prisma.sql`AND action = ${action}::"AuditAction"`
    : Prisma.sql``

  const [total, byActionRaw, byEntityTypeRaw, uniqueActorsRaw, timelineRaw] = await Promise.all([
    prisma.auditLog.count({ where }),

    prisma.auditLog.groupBy({
      by: ["action"],
      where,
      _count: { action: true },
    }),

    prisma.auditLog.groupBy({
      by: ["entityType"],
      where,
      _count: { entityType: true },
    }),

    prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(DISTINCT actor_id)::bigint AS count
      FROM audit_logs
      WHERE created_at >= ${dateFrom}
        AND created_at <= ${dateTo}
        ${entityFilter}
        ${actionFilter}
    `),

    prisma.$queryRaw<{ date: Date; action: string; count: bigint }[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date,
        action::text AS action,
        COUNT(*)::bigint AS count
      FROM audit_logs
      WHERE created_at >= ${dateFrom}
        AND created_at <= ${dateTo}
        ${entityFilter}
        ${actionFilter}
      GROUP BY 1, 2
      ORDER BY 1
    `),
  ])

  // Pivot timeline rows into { date, create: N, update: N, ..., total: N }
  const timelineMap = new Map<string, Record<string, number>>()
  for (const row of timelineRaw) {
    const dateStr = (row.date as Date).toISOString().slice(0, 10)
    if (!timelineMap.has(dateStr)) {
      timelineMap.set(dateStr, { date: dateStr as unknown as number, total: 0 })
    }
    const day = timelineMap.get(dateStr)!
    const n = Number(row.count)
    day[row.action] = n
    day.total = (day.total as number) + n
  }
  const timeline = Array.from(timelineMap.values())

  const byAction: Record<string, number> = {}
  for (const r of byActionRaw) byAction[r.action] = r._count.action

  const byEntityType: Record<string, number> = {}
  for (const r of byEntityTypeRaw) byEntityType[r.entityType] = r._count.entityType

  return NextResponse.json({
    total,
    uniqueActors: Number(uniqueActorsRaw[0]?.count ?? 0),
    byAction,
    byEntityType,
    timeline,
  })
})
