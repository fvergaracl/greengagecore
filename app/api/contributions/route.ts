// POST /api/contributions — Guarda una contribución (foto + survey)
// Incluye: validación geofence, anti-spoofing, idempotencia, GAME scoring.
import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { isWithinPoiRadius } from "@/domains/geo/geofence"
import { rewardsQueue } from "@/workers/index"
import { z } from "zod"

const ContributionSchema = z.object({
  taskId: z.string().uuid(),
  data: z.record(z.unknown()),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().optional(),
  localId: z.string().uuid().optional(), // Idempotency key from mobile
  deviceInfo: z.record(z.unknown()).optional(),
  simulationHash: z.string().optional(),
  simulatedTasks: z.array(z.unknown()).optional(),
  attachmentKeys: z.array(z.string()).optional(), // MinIO keys de fotos pre-subidas vía /api/uploads
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const parsed = ContributionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  const result = await withUserRLS(user, async (tx, ctx) => {
    // Idempotencia: si ya existe una contribución con este localId, retornar la existente
    if (data.localId) {
      const existing = await tx.contribution.findUnique({
        where: { localId: data.localId },
      })
      if (existing) return { contribution: existing, isDuplicate: true }
    }

    // Obtener la task con su POI y campaña
    const task = await tx.task.findUnique({
      where: { id: data.taskId, isDisabled: false },
      include: {
        poi: true,
        contributions: {
          where: { userId: ctx.userId, status: { in: ["submitted", "validated"] } },
          select: { id: true },
        },
      },
    })

    if (!task) throw Object.assign(new Error("TASK_NOT_FOUND"), { status: 404 })

    // Verificar límite de respuestas
    if (task.responseLimit === 1 && task.contributions.length >= 1) {
      throw Object.assign(new Error("TASK_ALREADY_COMPLETED"), { status: 409 })
    }

    // Validación geofence (anti-spoofing #1)
    if (task.poi) {
      const withinRadius = await isWithinPoiRadius(
        { latitude: data.latitude, longitude: data.longitude },
        task.poi.id,
        20 // 20m de tolerancia extra
      )
      if (!withinRadius) {
        throw Object.assign(new Error("OUTSIDE_POI_RADIUS"), { status: 422 })
      }
    }

    // Anti-spoofing #2: accuracy demasiado baja
    const maxAccuracy = 100 // metros; configurable por campaña
    if (data.accuracyMeters && data.accuracyMeters > maxAccuracy) {
      throw Object.assign(new Error("LOW_ACCURACY_GPS"), { status: 422 })
    }

    // Obtener campaignId
    const area = await tx.area.findUnique({
      where: { id: task.poi?.areaId ?? task.areaId ?? "" },
      select: { campaignId: true },
    })
    if (!area) throw Object.assign(new Error("AREA_NOT_FOUND"), { status: 404 })

    const contribution = await tx.contribution.create({
      data: {
        userId: ctx.userId,
        taskId: data.taskId,
        campaignId: area.campaignId,
        status: "submitted",
        data: data.data as object,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracyMeters: data.accuracyMeters,
        localId: data.localId,
        deviceInfo: data.deviceInfo as object ?? undefined,
        submittedAt: new Date(),
      },
    })

    // Registrar attachments en DB (fotos subidas previamente a MinIO)
    if (data.attachmentKeys?.length) {
      await tx.attachment.createMany({
        data: data.attachmentKeys.map((key) => {
          const ext = key.split(".").pop()?.toLowerCase() ?? "jpg"
          const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg"
          return {
            contributionId: contribution.id,
            type: "photo" as const,
            storageKey: key,
            mimeType,
            sizeBytes: BigInt(0), // actualizable en background si se necesita
          }
        }),
      })
    }

    // Telemetría
    await tx.telemetryEvent.create({
      data: {
        userId: ctx.userId,
        campaignId: area.campaignId,
        eventType: "contribution_submitted",
        latitude: data.latitude,
        longitude: data.longitude,
        payload: { taskId: data.taskId, contributionId: contribution.id },
      },
    })

    return { contribution, isDuplicate: false, campaignId: area.campaignId }
  })

  if (!result || !("campaignId" in result)) {
    return NextResponse.json(result, { status: 200 })
  }

  const { contribution, isDuplicate, campaignId } = result

  if (isDuplicate) {
    return NextResponse.json({ contribution, duplicate: true }, { status: 200 })
  }

  // Asignar puntos en GAME (async, no bloquea la respuesta)
  // Se crea un RewardEvent pendiente; el worker lo procesa
  if (campaignId) {
    const campaign = await withUserRLS(user, (tx) =>
      tx.campaign.findUnique({
        where: { id: campaignId },
        select: { gameEnabled: true, gameId: true, gameStrategy: true },
      })
    )

    if (campaign?.gameEnabled && campaign.gameId) {
      // Enqueue para procesar el reward asíncronamente
      await rewardsQueue.add(
        "process-reward",
        {
          contributionId: contribution.id,
          userId: user.sub,
          campaignId,
          taskId: data.taskId,
          simulationHash: data.simulationHash,
          simulatedTasks: data.simulatedTasks,
        },
        { attempts: 5, backoff: { type: "exponential", delay: 30_000 } }
      )
    }
  }

  return NextResponse.json(contribution, { status: 201 })
})
