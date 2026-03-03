// GreenCrowd V2 — Processor: Push Notifications (FCM/WebPush)
// Sends notifications when the user enters an area with tasks.

import webpush from "web-push"
import { prisma } from "@/lib/db"

// Configurar web-push con VAPID keys
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL ?? "admin@greencrowd.app"}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export type PushPayload = {
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
  campaignId?: string
  taskId?: string
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: payload.userId, isActive: true },
  })

  if (subscriptions.length === 0) return

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: payload.taskId ?? "general",
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      if (sub.platform === "webpush" && sub.endpoint && sub.keys) {
        const keys = sub.keys as { auth: string; p256dh: string }
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys },
          notification
        )
      } else if (sub.platform === "fcm" && sub.token) {
        // FCM via Firebase Admin SDK (requiere firebase-admin instalado)
        // Implementado en V1 post-MVP
        await sendFCM(sub.token, payload)
      }
    })
  )

  // Marcar como inactivas las subscripciones que fallaron (410 Gone)
  const failedEndpoints = results
    .map((r, i) => ({ r, sub: subscriptions[i] }))
    .filter(
      ({ r }) =>
        r.status === "rejected" &&
        (r.reason as { statusCode?: number })?.statusCode === 410
    )
    .map(({ sub }) => sub.endpoint)
    .filter(Boolean)

  if (failedEndpoints.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { endpoint: { in: failedEndpoints as string[] } },
      data: { isActive: false },
    })
  }
}

// Placeholder FCM (se completa cuando se añade firebase-admin)
async function sendFCM(token: string, payload: PushPayload): Promise<void> {
  const fcmServerKey = process.env.FCM_SERVER_KEY
  if (!fcmServerKey) return

  await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${fcmServerKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
    }),
  })
}
