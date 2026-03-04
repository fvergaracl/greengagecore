// POST /api/push/subscribe — Registra suscripción WebPush (browser)
// DELETE /api/push/subscribe — Desactiva suscripción

import { NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { z } from "zod"

const WebPushSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const parsed = WebPushSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { endpoint, keys } = parsed.data

  await withUserRLS(user, async (tx) => {
    // Upsert: si el endpoint ya existe, reactivar
    const existing = await tx.pushSubscription.findFirst({
      where: { endpoint },
    })

    if (existing) {
      await tx.pushSubscription.update({
        where: { id: existing.id },
        data: { isActive: true, keys, userId: user.userId },
      })
    } else {
      await tx.pushSubscription.create({
        data: {
          userId: user.userId,
          platform: "webpush",
          endpoint,
          keys,
          isActive: true,
        },
      })
    }
  })

  return NextResponse.json({ ok: true }, { status: 201 })
})

export const DELETE = withAuth(async (req, user) => {
  const body = await req.json()
  const { endpoint } = body as { endpoint?: string }
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 })
  }

  await withUserRLS(user, async (tx) => {
    await tx.pushSubscription.updateMany({
      where: { userId: user.userId, endpoint },
      data: { isActive: false },
    })
  })

  return NextResponse.json({ ok: true })
})
