// Dashboard — Campaign detail: analytics + areas/tasks + publish/archive actions.

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { CampaignStructureGraph } from "@/components/campaigns/CampaignStructureGraph"

export const metadata = { title: "Campaign — GreenCrowd" }

async function getCampaign(id: string, researcherId: string) {
  return prisma.campaign.findFirst({
    where: { id, researcherId },
    include: {
      areas: {
        include: {
          tasks: {
            include: { _count: { select: { contributions: true } } },
          },
          pointsOfInterest: {
            include: {
              tasks: {
                include: { _count: { select: { contributions: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { contributions: true } },
    },
  })
}

async function updateStatus(
  campaignId: string,
  newStatus: "published" | "archived" | "draft"
) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  await prisma.campaign.updateMany({
    where: { id: campaignId, researcherId: session.user.id },
    data: { status: newStatus },
  })
  redirect(`/dashboard/campaigns/${campaignId}`)
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const campaign = await getCampaign(id, session!.user!.id!)
  if (!campaign) notFound()

  const publishAction = updateStatus.bind(null, id, "published")
  const archiveAction = updateStatus.bind(null, id, "archived")
  const draftAction = updateStatus.bind(null, id, "draft")

  const contributionsByStatus = await prisma.contribution.groupBy({
    by: ["status"],
    where: { campaignId: id },
    _count: { _all: true },
  })

  const statusMap = Object.fromEntries(
    contributionsByStatus.map((r) => [r.status, r._count._all])
  )

  // Flatten all tasks for count
  const allTasks = campaign.areas.flatMap((area) => [
    ...area.tasks,
    ...area.pointsOfInterest.flatMap((poi) => poi.tasks),
  ])
  const structureAreas = campaign.areas.map((area) => ({
    id: area.id,
    name: area.name,
    isDisabled: area.isDisabled,
    openTasks: area.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      type: task.type,
      isDisabled: task.isDisabled,
      contributions: task._count.contributions,
    })),
    pois: area.pointsOfInterest.map((poi) => ({
      id: poi.id,
      name: poi.name,
      isDisabled: poi.isDisabled,
      tasks: poi.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        type: task.type,
        isDisabled: task.isDisabled,
        contributions: task._count.contributions,
      })),
    })),
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Breadcrumbs
            items={[
              { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
              { href: "/dashboard/campaigns", label: "Campaigns", emoji: "📢" },
              { label: campaign.name, emoji: "📢" },
            ]}
          />
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            📢 {campaign.name}
          </h1>
          <p className="text-sm text-gray-500">
            {campaign.category} · TZ: {campaign.timezone} · Status: <strong>{campaign.status}</strong>
          </p>
          {campaign.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {campaign.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/campaigns/${id}/edit`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Edit campaign
          </Link>
          {campaign.status === "draft" && (
            <form action={publishAction}>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Publish
              </button>
            </form>
          )}
          {campaign.status === "published" && (
            <form action={archiveAction}>
              <button
                type="submit"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Archive
              </button>
            </form>
          )}
          {campaign.status === "archived" && (
            <form action={draftAction}>
              <button
                type="submit"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reopen as draft
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Analytics cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">🗂️ Tasks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {allTasks.length}
          </p>
        </div>
        {(
          [
            ["submitted", "⏳ Pending"],
            ["validated", "✅ Validated"],
            ["rejected", "❌ Rejected"],
            ["flagged", "🚩 Flagged"],
          ] as [string, string][]
        ).map(([status, label]) => (
          <div
            key={status}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {statusMap[status] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Shortcuts */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/dashboard/campaigns/${id}/analytics`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          📈 Advanced analytics
        </Link>
        <Link
          href={`/dashboard/campaigns/${id}/questionnaires`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          📋 Questionnaires
        </Link>
        <Link
          href={`/dashboard/exports`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          📤 Export data
        </Link>
        <Link
          href="/dashboard/moderation"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          🔍 Review contributions ({statusMap["submitted"] ?? 0} pending)
        </Link>
      </div>

      <CampaignStructureGraph
        campaignId={id}
        campaignName={campaign.name}
        areas={structureAreas}
      />

      {/* Areas + Tasks */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Areas &amp; Tasks ({campaign.areas.length} areas, {allTasks.length} tasks)
          </h2>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/campaigns/${id}/areas`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              📍 Manage areas
            </Link>
            <Link
              href={`/dashboard/campaigns/${id}/tasks/new`}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              + Add task
            </Link>
          </div>
        </div>

        {campaign.areas.length === 0 ? (
          <p className="text-sm text-gray-500">
            No areas yet. Create areas via the API or import from GeoJSON.
          </p>
        ) : (
          <div className="space-y-4">
            {campaign.areas.map((area) => {
              const areaTasks = [
                ...area.tasks,
                ...area.pointsOfInterest.flatMap((p) => p.tasks),
              ]
              return (
                <div
                  key={area.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <p className="mb-2 font-medium text-gray-900 dark:text-gray-100">
                    📍 {area.name}{" "}
                    <span className="text-xs font-normal text-gray-400">
                      ({area.pointsOfInterest.length} POIs, {areaTasks.length} tasks)
                    </span>
                  </p>
                  {areaTasks.length > 0 ? (
                    <div className="space-y-1">
                      {areaTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {t.title}
                            <span className="ml-2 text-xs text-gray-400">
                              [{t.type}]
                            </span>
                          </span>
                          <span className="text-xs text-gray-400">
                            {t._count.contributions} contributions ·{" "}
                            {t.isDisabled ? "disabled" : "active"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No tasks in this area.</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
