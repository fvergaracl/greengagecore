// POST /api/push/fcm — Registra FCM/APNs token desde la app móvil
// DELETE /api/push/fcm — Elimina token (logout / desactivar notifs)

import { NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { z } from "zod"

const FcmSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["fcm", "apns"]),
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const parsed = FcmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { token, platform } = parsed.data

  await withUserRLS(user, async (tx) => {
    const existing = await tx.pushSubscription.findFirst({
      where: { token, platform },
    })

    if (existing) {
      await tx.pushSubscription.update({
        where: { id: existing.id },
        data: { isActive: true, userId: user.userId },
      })
    } else {
      await tx.pushSubscription.create({
        data: {
          userId: user.userId,
          platform,
          token,
          isActive: true,
        },
      })
    }
  })

  return NextResponse.json({ ok: true }, { status: 201 })
})

export const DELETE = withAuth(async (req, user) => {
  const body = await req.json()
  const { token } = body as { token?: string }
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 })
  }

  await withUserRLS(user, async (tx) => {
    await tx.pushSubscription.updateMany({
      where: { userId: user.userId, token },
      data: { isActive: false },
    })
  })

  return NextResponse.json({ ok: true })
})
