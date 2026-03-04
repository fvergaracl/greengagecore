// API: PATCH /api/admin/users/[id] — deshabilitar/habilitar usuario (superadmin only).

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { withSuperAdmin } from "@/middleware/auth"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  isDisabled: z.boolean(),
})

export function PATCH(req: NextRequest, { params }: Params) {
  return withSuperAdmin(async (req2, actor) => {
    const { id } = await params

    const body = await req2.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // No permitir auto-deshabilitación
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, sub: true } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.sub === actor.sub) {
      return NextResponse.json({ error: "Cannot disable your own account" }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isDisabled: parsed.data.isDisabled },
      select: { id: true, alias: true, isDisabled: true },
    })

    return NextResponse.json(updated)
  })(req)
}
