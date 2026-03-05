// Dashboard — Analytics avanzados de campaña (server component + client chart).

import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ContributionsChart } from "@/components/analytics/ContributionsChart"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"

export const metadata = { title: "Analytics — GreenCrowd" }

// Revalidar cada 5 minutos (datos analíticos no necesitan ser en tiempo real)
export const revalidate = 300

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ days?: string }> }

async function getAnalytics(campaignId: string, researcherId: string, days: number) {
  // Verificar ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, researcherId },
    select: { id: true, name: true, status: true, category: true },
  })
  if (!campaign) return null

  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  // Contribuciones por día
  const dailyRaw = await prisma.$queryRaw<
    { date: Date; status: string; count: bigint }[]
  >`
    SELECT
      date_trunc('day', created_at AT TIME ZONE 'UTC') AS date,
      status,
      COUNT(*) AS count
    FROM contributions
    WHERE campaign_id = ${campaignId}::uuid
      AND created_at >= ${since}
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `

  // Construir mapa de fechas
  const dateMap = new Map<string, { date: string; submitted: number; validated: number; rejected: number; flagged: number; total: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dateMap.set(key, { date: key, submitted: 0, validated: 0, rejected: 0, flagged: 0, total: 0 })
  }
  for (const row of dailyRaw) {
    const key = new Date(row.date).toISOString().slice(0, 10)
    const entry = dateMap.get(key)
    if (!entry) continue
    const n = Number(row.count)
    ;(entry as Record<string, number>)[row.status] = n
    entry.total += n
  }

  const timeSeries = Array.from(dateMap.values())

  // Desglose por tarea
  const byTaskRaw = await prisma.$queryRaw<
    { task_id: string; title: string; count: bigint; validated: bigint }[]
  >`
    SELECT
      t.id AS task_id,
      t.title,
      COUNT(c.id) AS count,
      COUNT(c.id) FILTER (WHERE c.status = 'validated') AS validated
    FROM tasks t
    LEFT JOIN contributions c ON c.task_id = t.id AND c.campaign_id = ${campaignId}::uuid
    WHERE (t.area_id IN (SELECT id FROM areas WHERE campaign_id = ${campaignId}::uuid)
        OR t.poi_id IN (SELECT poi.id FROM points_of_interest poi
                        JOIN areas a ON poi.area_id = a.id
                        WHERE a.campaign_id = ${campaignId}::uuid))
    GROUP BY t.id, t.title
    ORDER BY count DESC
    LIMIT 10
  `

  const byTask = byTaskRaw.map((r) => ({
    taskId: r.task_id,
    title: r.title,
    total: Number(r.count),
    validated: Number(r.validated),
  }))

  // Usuarios únicos en el período
  const uniqueContributors = await prisma.contribution.findMany({
    where: { campaignId, createdAt: { gte: since } },
    distinct: ["userId"],
    select: { userId: true },
  })

  const summary = timeSeries.reduce(
    (acc, d) => {
      acc.total += d.total
      acc.submitted += d.submitted
      acc.validated += d.validated
      acc.rejected += d.rejected
      acc.flagged += d.flagged
      return acc
    },
    { total: 0, submitted: 0, validated: 0, rejected: 0, flagged: 0 }
  )

  const validationRate =
    summary.total > 0
      ? Math.round(((summary.validated) / summary.total) * 100)
      : 0

  return {
    campaign,
    timeSeries,
    byTask,
    summary,
    uniqueContributors: uniqueContributors.length,
    validationRate,
  }
}

export default async function AnalyticsPage({ params, searchParams }: Params) {
  const { id } = await params
  const { days: daysParam } = await searchParams
  const days = Math.min(parseInt(daysParam ?? "30"), 90)

  const session = await auth()
  const data = await getAnalytics(id, session!.user!.id!, days)
  if (!data) notFound()

  const { campaign, timeSeries, byTask, summary, uniqueContributors, validationRate } = data

  const PERIOD_OPTIONS = [7, 14, 30, 60, 90]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
              { href: "/dashboard/campaigns", label: "Campaigns", emoji: "📢" },
              { href: `/dashboard/campaigns/${id}`, label: campaign.name, emoji: "📢" },
              { label: "Analytics", emoji: "📈" },
            ]}
          />
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            📈 Analytics
          </h1>
          <p className="text-sm text-gray-500">{campaign.category}</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          {PERIOD_OPTIONS.map((d) => (
            <Link
              key={d}
              href={`/dashboard/campaigns/${id}/analytics?days=${d}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                d === days
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: summary.total, color: "text-gray-900 dark:text-gray-100" },
          { label: "Pending", value: summary.submitted, color: "text-amber-600" },
          { label: "Validated", value: summary.validated, color: "text-green-600" },
          { label: "Rejected", value: summary.rejected, color: "text-red-600" },
          { label: "Flagged", value: summary.flagged, color: "text-purple-600" },
          { label: "Contributors", value: uniqueContributors, color: "text-blue-600" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Validation rate bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Validation rate
          </span>
          <span className="font-bold text-green-600">{validationRate}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${validationRate}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {summary.validated} validated out of {summary.total} total contributions
        </p>
      </div>

      {/* Charts */}
      <ContributionsChart timeSeries={timeSeries} byTask={byTask} days={days} />
    </div>
  )
}
