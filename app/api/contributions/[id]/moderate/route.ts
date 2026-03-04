// POST /api/contributions/:id/moderate — Valida o rechaza una contribución.
// Requiere rol researcher (solo sus propias campañas) o superadmin.
// Tras la decisión, encola push notification al contributor.

import { NextRequest, NextResponse } from "next/server"
import { withResearcher } from "@/middleware/auth"
import { withUserRLS } from "@/middleware/rls"
import { pushQueue } from "@/workers/index"
import { z } from "zod"

const ModerationSchema = z.object({
  decision: z.enum(["validated", "rejected", "flagged"]),
  comment: z.string().max(500).optional(),
})

export const POST = withResearcher(async (req: NextRequest, user) => {
  // Extraer contributionId de la URL: /api/contributions/:id/moderate
  const contributionId = req.nextUrl.pathname.split("/")[3]

  const body = await req.json()
  const parsed = ModerationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { decision, comment } = parsed.data

  let contributorId: string
  let taskTitle: string

  try {
    const result = await withUserRLS(user, async (tx) => {
      const existing = await tx.contribution.findFirst({
        where: {
          id: contributionId,
          campaign: { researcherId: user.userId },
          status: "submitted",
        },
        include: { task: { select: { title: true } } },
      })

      if (!existing) {
        throw Object.assign(
          new Error("CONTRIBUTION_NOT_FOUND_OR_NOT_PENDING"),
          { status: 404 }
        )
      }

      await tx.contribution.update({
        where: { id: contributionId },
        data: {
          status: decision,
          data: {
            ...(existing.data as Record<string, unknown>),
            _moderation: {
              decision,
              comment: comment ?? null,
              moderatorId: user.userId,
              moderatedAt: new Date().toISOString(),
            },
          },
        },
      })

      return { contributorId: existing.userId, taskTitle: existing.task.title }
    })

    contributorId = result.contributorId
    taskTitle = result.taskTitle
  } catch (err) {
    const e = err as { status?: number }
    if (e.status === 404) {
      return NextResponse.json(
        { error: "Contribution not found or not pending moderation" },
        { status: 404 }
      )
    }
    throw err
  }

  // Push notification al contributor
  const notifTitle =
    decision === "validated"
      ? "✅ Contribution approved"
      : decision === "rejected"
        ? "❌ Contribution rejected"
        : "🚩 Contribution flagged for review"

  const notifBody =
    decision === "validated"
      ? `Your response to "${taskTitle}" was accepted. Points awarded!`
      : `Your response to "${taskTitle}" was ${decision}.${comment ? ` Reason: ${comment}` : ""}`

  await pushQueue.add("push", {
    userId: contributorId,
    title: notifTitle,
    body: notifBody,
    data: { contributionId, decision },
  })

  return NextResponse.json({ ok: true, status: decision })
})
