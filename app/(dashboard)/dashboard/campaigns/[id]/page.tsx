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
  const totalOpenTasks = campaign.areas.reduce(
    (sum, area) => sum + area.tasks.length,
    0
  )
  const totalPoiTasks = campaign.areas.reduce(
    (sum, area) =>
      sum +
      area.pointsOfInterest.reduce((poiSum, poi) => poiSum + poi.tasks.length, 0),
    0
  )
  const taskTypeClass: Record<string, string> = {
    photo:
      "bg-sky-100 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800",
    survey:
      "bg-violet-100 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800",
    mixed:
      "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800",
    instruction:
      "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800",
  }
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

      {/* Areas + Tasks */}
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              🧩 Areas &amp; Tasks
            </h2>
            <p className="text-xs text-gray-500">
              {campaign.areas.length} areas · {allTasks.length} tasks
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/campaigns/${id}/areas`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              📍 Manage areas
            </Link>
            <Link
              href={`/dashboard/campaigns/${id}/tasks/new`}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700"
            >
              + Add task
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
            🗺️ {campaign.areas.length} areas
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800">
            🧭 {totalOpenTasks} open tasks
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800">
            📌 {totalPoiTasks} POI tasks
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800">
            ✅ {statusMap["validated"] ?? 0} validated contributions
          </span>
        </div>

        {campaign.areas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-4 py-6 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900/60">
            No areas yet. Create areas and start adding open tasks or POI tasks.
          </div>
        ) : (
          <div className="space-y-4">
            {campaign.areas.map((area) => {
              const openTasks = area.tasks
              const poiTasks = area.pointsOfInterest.flatMap((poi) =>
                poi.tasks.map((task) => ({
                  ...task,
                  poiName: poi.name,
                }))
              )
              const areaContributionCount = [...openTasks, ...poiTasks].reduce(
                (sum, task) => sum + task._count.contributions,
                0
              )

              return (
                <article
                  key={area.id}
                  className="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm transition-colors hover:border-green-300 dark:border-gray-700 dark:bg-gray-800/90"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        🗺️ {area.name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          📌 {area.pointsOfInterest.length} POIs
                        </span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          🧭 {openTasks.length} open
                        </span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          📍 {poiTasks.length} POI
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          ✅ {areaContributionCount} contrib.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          area.isDisabled
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        }`}
                      >
                        {area.isDisabled ? "disabled" : "active"}
                      </span>
                      <Link
                        href={`/dashboard/campaigns/${id}/areas/${area.id}/pois`}
                        className="rounded-md border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Manage POIs
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Open Tasks (Area-wide)
                      </p>
                      {openTasks.length === 0 ? (
                        <p className="text-xs text-gray-400">No open tasks in this area.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {openTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-gray-700 dark:text-gray-300">
                                  {task.title}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    taskTypeClass[task.type] ?? taskTypeClass.mixed
                                  }`}
                                >
                                  {task.type}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {task._count.contributions} contrib. ·{" "}
                                {task.isDisabled ? "disabled" : "active"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        POI Tasks
                      </p>
                      {poiTasks.length === 0 ? (
                        <p className="text-xs text-gray-400">No POI tasks in this area.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {poiTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-gray-700 dark:text-gray-300">
                                  {task.title}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    taskTypeClass[task.type] ?? taskTypeClass.mixed
                                  }`}
                                >
                                  {task.type}
                                </span>
                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  📌 {task.poiName}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {task._count.contributions} contrib. ·{" "}
                                {task.isDisabled ? "disabled" : "active"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <CampaignStructureGraph
        campaignId={id}
        campaignName={campaign.name}
        areas={structureAreas}
      />
    </div>
  )
}
