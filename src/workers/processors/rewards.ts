// GreenCrowd V2 — Processor: pending reward_events
// Processes reward events that failed because GAME was down.

import { prisma } from "@/lib/db"
import { assignPoints, simulatePoints } from "@/domains/game/client"
import { buildPoiTaskExternalTaskId, buildOpenTaskExternalTaskId } from "@/domains/game/external-ids"

export async function processRewardEvent(rewardEventId: string): Promise<void> {
  const event = await prisma.rewardEvent.findUnique({
    where: { id: rewardEventId },
    include: {
      campaign: true,
      task: { include: { poi: true } },
    },
  })

  if (!event || event.status !== "pending") return

  if (!event.campaign.gameEnabled || !event.campaign.gameId) {
    // GAME no configurado para esta campaña; marcar como aplicado sin puntos
    await prisma.rewardEvent.update({
      where: { id: rewardEventId },
      data: { status: "applied", points: 0 },
    })
    return
  }

  try {
    const externalUserId = await prisma.user.findUniqueOrThrow({
      where: { id: event.userId },
      select: { sub: true },
    }).then((u) => u.sub)

    const externalTaskId = event.task.poiId
      ? buildPoiTaskExternalTaskId(event.campaignId, event.task.poiId, event.taskId)
      : buildOpenTaskExternalTaskId(event.campaignId, event.taskId)

    // Simular puntos (puede retornar null si GAME sigue caído)
    const simulated = await simulatePoints(
      event.campaign.gameId,
      externalUserId,
      externalTaskId
    )

    if (!simulated) {
      // GAME sigue caído, dejar en pending para siguiente retry
      return
    }

    const result = await assignPoints(
      event.campaign.gameId,
      event.taskId, // gameTaskId
      externalUserId,
      {
        simulationHash: simulated.simulationHash,
        tasks: [simulated],
      }
    )

    if (!result) return

    // Actualizar reward event y wallet
    await prisma.$transaction([
      prisma.rewardEvent.update({
        where: { id: rewardEventId },
        data: {
          status: "applied",
          points: result.points,
          gameResponse: JSON.parse(JSON.stringify(result)),
        },
      }),
      prisma.userWallet.upsert({
        where: { userId_campaignId: { userId: event.userId, campaignId: event.campaignId } },
        create: {
          userId: event.userId,
          campaignId: event.campaignId,
          totalPoints: result.points,
          lastSyncedAt: new Date(),
        },
        update: {
          totalPoints: { increment: result.points },
          lastSyncedAt: new Date(),
        },
      }),
    ])
  } catch (err) {
    console.error(`[RewardsProcessor] Failed to process event ${rewardEventId}:`, err)
    await prisma.rewardEvent.update({
      where: { id: rewardEventId },
      data: { status: "failed" },
    })
  }
}

/**
 * Reintenta todos los reward_events pendientes (llamado cada minuto).
 */
export async function retryPendingRewards(): Promise<void> {
  const pending = await prisma.rewardEvent.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 50,
  })

  for (const event of pending) {
    await processRewardEvent(event.id).catch((err) => {
      console.error(`[RewardsProcessor] Error processing ${event.id}:`, err.message)
    })
  }
}
