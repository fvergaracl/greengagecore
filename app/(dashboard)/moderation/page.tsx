// Dashboard — Moderation queue.
// Muestra las contribuciones submitted de las campañas del researcher.
// Las acciones (validate/reject/flag) se ejecutan vía Server Actions.

import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const metadata = { title: "Moderation — GreenCrowd" }

async function getPendingContributions(researcherId: string) {
  return prisma.contribution.findMany({
    where: {
      status: "submitted",
      campaign: { researcherId },
    },
    orderBy: { submittedAt: "asc" },
    take: 50,
    include: {
      task: { select: { title: true, requiresPhoto: true } },
      campaign: { select: { name: true } },
      user: { select: { alias: true, sub: true } },
    },
  })
}

async function moderateAction(
  contributionId: string,
  decision: "validated" | "rejected" | "flagged",
  formData: FormData
) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")

  const comment = formData.get("comment") as string | null

  const contribution = await prisma.contribution.findFirst({
    where: {
      id: contributionId,
      campaign: { researcherId: session.user.id },
      status: "submitted",
    },
    include: { task: { select: { title: true } } },
  })

  if (!contribution) notFound()

  await prisma.contribution.update({
    where: { id: contributionId },
    data: {
      status: decision,
      data: {
        ...(contribution.data as Record<string, unknown>),
        _moderation: {
          decision,
          comment: comment?.trim() || null,
          moderatorId: session.user.id,
          moderatedAt: new Date().toISOString(),
        },
      },
    },
  })

  // Enqueue push notification via API (Server Action puede llamar a la cola directa)
  const { pushQueue } = await import("@/workers/index")
  const notifTitle =
    decision === "validated"
      ? "✅ Contribution approved"
      : decision === "rejected"
        ? "❌ Contribution rejected"
        : "🚩 Contribution flagged"

  await pushQueue.add("push", {
    userId: contribution.userId,
    title: notifTitle,
    body:
      decision === "validated"
        ? `Your response to "${contribution.task.title}" was accepted!`
        : `Your response to "${contribution.task.title}" was ${decision}.${comment ? ` Reason: ${comment}` : ""}`,
    data: { contributionId, decision },
  })

  redirect("/dashboard/moderation")
}

export default async function ModerationPage() {
  const session = await auth()
  const contributions = await getPendingContributions(session!.user!.id!)

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Moderation Queue
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {contributions.length} contribution{contributions.length !== 1 ? "s" : ""} pending review
      </p>

      {contributions.length === 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-12 text-center dark:border-green-800 dark:bg-green-900/20">
          <p className="text-2xl">✅</p>
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">
            All caught up! No pending contributions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contributions.map((c) => {
            const validateAction = moderateAction.bind(null, c.id, "validated")
            const rejectAction = moderateAction.bind(null, c.id, "rejected")
            const flagAction = moderateAction.bind(null, c.id, "flagged")

            const surveyData = c.data as Record<string, unknown>
            const attachmentKeys = (surveyData.attachmentKeys ?? []) as string[]

            return (
              <div
                key={c.id}
                className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {c.task.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      Campaign: {c.campaign.name} · By: {c.user?.alias ?? c.user?.sub ?? "unknown"} ·{" "}
                      {new Date(c.submittedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      GPS: {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                      {c.accuracyMeters ? ` (±${Math.round(c.accuracyMeters)}m)` : ""}
                    </p>
                  </div>
                </div>

                {/* Survey data preview */}
                {Object.keys(surveyData).filter((k) => !k.startsWith("_") && k !== "attachmentKeys").length > 0 && (
                  <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(surveyData).filter(
                          ([k]) => !k.startsWith("_") && k !== "attachmentKeys"
                        )
                      ),
                      null,
                      2
                    )}
                  </pre>
                )}

                {/* Attachment thumbnails */}
                {attachmentKeys.length > 0 && (
                  <div className="mb-4 flex gap-2 flex-wrap">
                    {attachmentKeys.map((key) => (
                      <a
                        key={key}
                        href={`/api/uploads/${encodeURIComponent(key)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        📎 {key.split("/").pop()}
                      </a>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-48">
                    <label className="mb-1 block text-xs text-gray-500">
                      Comment (optional)
                    </label>
                    <input
                      form={`form-reject-${c.id}`}
                      name="comment"
                      type="text"
                      placeholder="Reason for rejection…"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>
                  <form id={`form-validate-${c.id}`} action={validateAction}>
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      ✅ Approve
                    </button>
                  </form>
                  <form id={`form-reject-${c.id}`} action={rejectAction}>
                    <button
                      type="submit"
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      ❌ Reject
                    </button>
                  </form>
                  <form action={flagAction}>
                    <button
                      type="submit"
                      className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400"
                    >
                      🚩 Flag
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
