// GreenCrowd V2 — Processor: Push Notifications (FCM v1 HTTP API + WebPush)
// Sends notifications when contributions are moderated or the user enters an area.

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

  const notificationJson = JSON.stringify({
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
          notificationJson
        )
      } else if ((sub.platform === "fcm" || sub.platform === "apns") && sub.token) {
        await sendFCMv1(sub.token, payload)
      }
    })
  )

  // Marcar como inactivas las suscripciones con error 410 Gone (WebPush)
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

// ─── FCM v1 HTTP API (usa Service Account, no legacy server key) ──────────────

let _fcmAccessToken: { token: string; expiresAt: number } | null = null

/** Obtiene un access token OAuth2 para FCM v1 via JWT de Service Account */
async function getFcmAccessToken(): Promise<string> {
  if (_fcmAccessToken && Date.now() < _fcmAccessToken.expiresAt - 60_000) {
    return _fcmAccessToken.token
  }

  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set")

  const serviceAccount = JSON.parse(sa) as {
    client_email: string
    private_key: string
    project_id: string
  }

  // JWT firmado con la clave privada del service account
  const { SignJWT, importPKCS8 } = await import("jose")
  const now = Math.floor(Date.now() / 1000)
  const privateKey = await importPKCS8(serviceAccount.private_key, "RS256")

  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey)

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  })

  const json = (await resp.json()) as { access_token: string; expires_in: number }
  _fcmAccessToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
  return _fcmAccessToken.token
}

async function sendFCMv1(token: string, payload: PushPayload): Promise<void> {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!sa) return // FCM no configurado → no enviar

  const serviceAccount = JSON.parse(sa) as { project_id: string }
  const accessToken = await getFcmAccessToken()

  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: Object.fromEntries(
            Object.entries(payload.data ?? {}).map(([k, v]) => [k, String(v)])
          ),
          android: {
            notification: {
              icon: "ic_notification",
              color: "#4CAF50",
              channel_id: "greencrowd_default",
            },
          },
          apns: {
            payload: {
              aps: { sound: "default" },
            },
          },
        },
      }),
    }
  )

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`FCM v1 error ${resp.status}: ${err}`)
  }
}
