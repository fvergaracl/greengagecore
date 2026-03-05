// Dashboard overview for researchers.
// Focus: health of campaigns + moderation + recent activity.

import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const metadata = { title: "Dashboard — GreenCrowd" }

type CampaignStatus = "draft" | "published" | "archived"

type CampaignSummary = {
  id: string
  name: string
  status: CampaignStatus
  createdAt: Date
  areas: number
  contributions: number
  pending: number
}

type OverviewStats = {
  campaignsTotal: number
  campaignsByStatus: Record<CampaignStatus, number>
  contributionsTotal: number
  contributionsLast7: number
  contributionsPrev7: number
  pendingModeration: number
  validatedContributions: number
  uniqueContributors: number
  oldestPendingAt: Date | null
  topCampaigns: CampaignSummary[]
  recentCampaigns: CampaignSummary[]
}

const STATUS_BADGE: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  archived: "bg-amber-100 text-amber-700",
}

async function getStats(researcherId: string): Promise<OverviewStats> {
  const now = new Date()
  const last7Start = new Date(now)
  last7Start.setDate(last7Start.getDate() - 7)
  const prev7Start = new Date(now)
  prev7Start.setDate(prev7Start.getDate() - 14)

  const [
    campaignsTotal,
    draftCampaigns,
    publishedCampaigns,
    archivedCampaigns,
    contributionsTotal,
    pendingModeration,
    validatedContributions,
    contributionsLast7,
    contributionsPrev7,
    oldestPending,
    contributorsByUser,
    campaigns,
    pendingByCampaign,
  ] = await Promise.all([
    prisma.campaign.count({ where: { researcherId } }),
    prisma.campaign.count({ where: { researcherId, status: "draft" } }),
    prisma.campaign.count({ where: { researcherId, status: "published" } }),
    prisma.campaign.count({ where: { researcherId, status: "archived" } }),
    prisma.contribution.count({ where: { campaign: { researcherId } } }),
    prisma.contribution.count({
      where: { campaign: { researcherId }, status: "submitted" },
    }),
    prisma.contribution.count({
      where: { campaign: { researcherId }, status: "validated" },
    }),
    prisma.contribution.count({
      where: {
        campaign: { researcherId },
        submittedAt: { gte: last7Start },
      },
    }),
    prisma.contribution.count({
      where: {
        campaign: { researcherId },
        submittedAt: { gte: prev7Start, lt: last7Start },
      },
    }),
    prisma.contribution.findFirst({
      where: { campaign: { researcherId }, status: "submitted" },
      orderBy: { submittedAt: "asc" },
      select: { submittedAt: true },
    }),
    prisma.contribution.groupBy({
      by: ["userId"],
      where: { campaign: { researcherId } },
      _count: { _all: true },
    }),
    prisma.campaign.findMany({
      where: { researcherId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        _count: { select: { areas: true, contributions: true } },
      },
    }),
    prisma.contribution.groupBy({
      by: ["campaignId"],
      where: { campaign: { researcherId }, status: "submitted" },
      _count: { _all: true },
    }),
  ])

  const pendingByCampaignMap = new Map(
    pendingByCampaign.map((row) => [row.campaignId, row._count._all])
  )

  const campaignRows: CampaignSummary[] = campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status as CampaignStatus,
    createdAt: campaign.createdAt,
    areas: campaign._count.areas,
    contributions: campaign._count.contributions,
    pending: pendingByCampaignMap.get(campaign.id) ?? 0,
  }))

  const topCampaigns = [...campaignRows]
    .sort((a, b) => b.contributions - a.contributions)
    .slice(0, 5)

  return {
    campaignsTotal,
    campaignsByStatus: {
      draft: draftCampaigns,
      published: publishedCampaigns,
      archived: archivedCampaigns,
    },
    contributionsTotal,
    contributionsLast7,
    contributionsPrev7,
    pendingModeration,
    validatedContributions,
    uniqueContributors: contributorsByUser.length,
    oldestPendingAt: oldestPending?.submittedAt ?? null,
    topCampaigns,
    recentCampaigns: campaignRows.slice(0, 5),
  }
}

function formatTrend(current: number, previous: number) {
  if (previous === 0 && current === 0) {
    return { label: "No change vs previous 7 days", tone: "flat" as const }
  }
  if (previous === 0) {
    return { label: "+100% vs previous 7 days", tone: "up" as const }
  }
  const delta = current - previous
  if (delta === 0) {
    return { label: "0% vs previous 7 days", tone: "flat" as const }
  }
  const pct = Math.round((Math.abs(delta) / previous) * 100)
  return {
    label: `${delta > 0 ? "+" : "-"}${pct}% vs previous 7 days`,
    tone: delta > 0 ? ("up" as const) : ("down" as const),
  }
}

function formatAge(from: Date) {
  const diffMs = Date.now() - from.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Please sign in to view your dashboard.
        </p>
      </div>
    )
  }

  const stats = await getStats(session.user.id)
  const trend = formatTrend(stats.contributionsLast7, stats.contributionsPrev7)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Research dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Overview
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Key campaign, moderation and contribution metrics.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/campaigns/new"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + New campaign
          </Link>
          <Link
            href="/dashboard/moderation"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            🔍 Moderation
          </Link>
          <Link
            href="/dashboard/exports"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            📤 Exports
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon="📢"
          label="Campaigns"
          value={stats.campaignsTotal}
          subtitle={`${stats.campaignsByStatus.published} published`}
        />
        <KpiCard
          icon="📈"
          label="Contributions (7d)"
          value={stats.contributionsLast7}
          subtitle={trend.label}
          tone={trend.tone}
        />
        <KpiCard
          icon="🔍"
          label="Pending moderation"
          value={stats.pendingModeration}
          subtitle={
            stats.oldestPendingAt
              ? `Oldest pending: ${formatAge(stats.oldestPendingAt)}`
              : "No pending items"
          }
          tone={stats.pendingModeration > 0 ? "down" : "up"}
        />
        <KpiCard
          icon="👥"
          label="Unique contributors"
          value={stats.uniqueContributors}
          subtitle={`${stats.validatedContributions} validated responses`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Campaign lifecycle
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Distribution by status.
          </p>

          <div className="mt-4 space-y-3">
            {(["published", "draft", "archived"] as CampaignStatus[]).map((status) => {
              const count = stats.campaignsByStatus[status]
              const ratio =
                stats.campaignsTotal > 0
                  ? Math.round((count / stats.campaignsTotal) * 100)
                  : 0

              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-700 dark:text-gray-300">
                      {status}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {count} ({ratio}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Top campaigns
            </h2>
            <Link
              href="/dashboard/campaigns"
              className="text-xs text-green-700 hover:underline dark:text-green-400"
            >
              View all
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ranked by total contributions.
          </p>

          {stats.topCampaigns.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No campaigns yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {stats.topCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/dashboard/campaigns/${campaign.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:border-green-300 dark:border-gray-700 dark:hover:border-green-700"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {campaign.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {campaign.contributions} contributions · {campaign.pending} pending
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_BADGE[campaign.status]
                    }`}
                  >
                    {campaign.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Recent campaigns
          </h2>
          <p className="text-xs text-gray-500">
            Total contributions: {stats.contributionsTotal.toLocaleString()}
          </p>
        </div>

        {stats.recentCampaigns.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            You have not created campaigns yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {stats.recentCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/dashboard/campaigns/${campaign.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:border-green-300 dark:border-gray-700 dark:hover:border-green-700"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {campaign.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {campaign.areas} areas · {campaign.contributions} contributions
                  </p>
                </div>
                <p className="text-xs text-gray-400">{formatDate(campaign.createdAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  subtitle,
  tone = "flat",
}: {
  icon: string
  label: string
  value: number
  subtitle: string
  tone?: "up" | "down" | "flat"
}) {
  const toneClass =
    tone === "up"
      ? "text-green-700 dark:text-green-400"
      : tone === "down"
        ? "text-amber-700 dark:text-amber-400"
        : "text-gray-500 dark:text-gray-400"

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-2xl">{icon}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{label}</p>
      <p className={`mt-1 text-xs ${toneClass}`}>{subtitle}</p>
    </div>
  )
}
