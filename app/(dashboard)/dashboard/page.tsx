// Dashboard overview: métricas globales del researcher.

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const metadata = { title: "Dashboard — GreenCrowd" }

async function getStats(researcherId: string) {
  const [campaigns, contributions, pending] = await Promise.all([
    prisma.campaign.count({ where: { researcherId } }),
    prisma.contribution.count({
      where: { campaign: { researcherId } }
    }),
    prisma.contribution.count({
      where: { campaign: { researcherId }, status: "submitted" }
    })
  ])
  return { campaigns, contributions, pending }
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return (
      <div className='p-6 text-center'>
        <p className='text-lg text-gray-700 dark:text-gray-300'>
          Please sign in to view your dashboard.
        </p>
      </div>
    )
  }

  const researcherId = session.user.id
  const stats = await getStats(researcherId)

  return (
    <div>
      <h1 className='mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100'>
        Overview
      </h1>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard label='Campaigns' value={stats.campaigns} icon='🗺️' />
        <StatCard
          label='Total contributions'
          value={stats.contributions}
          icon='📋'
        />
        <StatCard
          label='Pending moderation'
          value={stats.pending}
          icon='🔍'
          highlight={stats.pending > 0}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  highlight = false
}: {
  label: string
  value: number
  icon: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        highlight
          ? "border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      <p className='text-2xl'>{icon}</p>
      <p
        className={`mt-2 text-3xl font-bold ${
          highlight
            ? "text-amber-700 dark:text-amber-400"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value.toLocaleString()}
      </p>
      <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>{label}</p>
    </div>
  )
}
