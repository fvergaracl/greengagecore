// API: GET /api/audit — listar audit logs (superadmin only).
// Filtros: entityType, action, actorId, from, to, page, limit

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withSuperAdmin } from "@/middleware/auth"
import type { AuditAction } from "@prisma/client"

export const GET = withSuperAdmin(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl
  const entityType = searchParams.get("entityType") ?? undefined
  const action = searchParams.get("action") as AuditAction | null
  const actorId = searchParams.get("actorId") ?? undefined
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "25")))
  const skip = (page - 1) * limit

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
    ...(actorId ? { actorId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { id: true, alias: true, sub: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    logs,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  })
})
