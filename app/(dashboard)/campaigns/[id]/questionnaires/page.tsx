// Dashboard — Lista de cuestionarios de una campaña.

import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const metadata = { title: "Questionnaires — GreenCrowd" }

const CONDITION_LABEL: Record<string, string> = {
  before: "Before campaign",
  after: "After campaign",
  daily: "Daily",
  every_x_days: "Every N days",
}

async function getCampaignQuestionnaires(campaignId: string, researcherId: string) {
  return prisma.campaign.findFirst({
    where: { id: campaignId, researcherId },
    include: {
      questionnaires: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { responses: true } } },
      },
    },
  })
}

export default async function QuestionnairesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const campaign = await getCampaignQuestionnaires(id, session!.user!.id!)
  if (!campaign) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/campaigns/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← {campaign.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Questionnaires ({campaign.questionnaires.length})
          </h1>
          <p className="text-sm text-gray-500">
            Pre/post questionnaires shown to contributors at specific times.
          </p>
        </div>
        <Link
          href={`/dashboard/campaigns/${id}/questionnaires/new`}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          + New questionnaire
        </Link>
      </div>

      {campaign.questionnaires.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <p className="text-gray-500">No questionnaires yet.</p>
          <Link
            href={`/dashboard/campaigns/${id}/questionnaires/new`}
            className="mt-2 inline-block text-sm text-green-600 underline"
          >
            Build your first questionnaire
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaign.questionnaires.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{q.title}</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {CONDITION_LABEL[q.condition] ?? q.condition}
                  {q.frequencyInDays ? ` (every ${q.frequencyInDays} days)` : ""}
                  {" · "}
                  {q._count.responses} responses
                </p>
              </div>
              <DeleteQuestionnaireButton questionnaireId={q.id} campaignId={id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DeleteQuestionnaireButton({ questionnaireId, campaignId }: { questionnaireId: string; campaignId: string }) {
  async function deleteQuestionnaire() {
    "use server"
    const { auth: getAuth } = await import("@/lib/auth")
    const { prisma: db } = await import("@/lib/db")
    const { redirect } = await import("next/navigation")
    const session = await getAuth()
    if (!session?.user?.id) redirect("/signin")
    await db.questionnaire.deleteMany({
      where: { id: questionnaireId, campaign: { researcherId: session.user.id! } },
    })
    redirect(`/dashboard/campaigns/${campaignId}/questionnaires`)
  }

  return (
    <form action={deleteQuestionnaire}>
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
      >
        Delete
      </button>
    </form>
  )
}
