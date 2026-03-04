// API: GET /api/admin/users — listar usuarios (superadmin only).
// Soporta ?search=alias&page=1&limit=20

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withSuperAdmin } from "@/middleware/auth"

export const GET = withSuperAdmin(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl
  const search = searchParams.get("search")?.trim() ?? ""
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")))
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { alias: { contains: search, mode: "insensitive" as const } },
          { sub: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { contributions: true, ownedCampaigns: true } },
        wallet: { select: { totalPoints: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      sub: u.sub,
      alias: u.alias,
      isDisabled: u.isDisabled,
      createdAt: u.createdAt,
      contributions: u._count.contributions,
      campaigns: u._count.ownedCampaigns,
      totalPoints: u.wallet.reduce((s, w) => s + w.totalPoints, 0),
    })),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  })
})
