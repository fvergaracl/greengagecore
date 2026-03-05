// Dashboard — Campaigns list (researcher view).

import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"

export const metadata = { title: "Campaigns — GreenCrowd" }

async function getCampaigns(researcherId: string) {
  return prisma.campaign.findMany({
    where: { researcherId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contributions: true, areas: true } },
    },
  })
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  archived: "bg-amber-100 text-amber-700",
}

export default async function CampaignsPage() {
  const session = await auth()
  const campaigns = await getCampaigns(session!.user!.id!)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Breadcrumbs
            items={[
              { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
              { label: "Campaigns", emoji: "📢" },
            ]}
          />
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            📢 Campaigns
          </h1>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          + New campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-center text-gray-500 py-16">
          No campaigns yet.{" "}
          <Link href="/dashboard/campaigns/new" className="text-green-600 underline">
            Create your first one.
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/campaigns/${c.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 hover:border-green-300 hover:shadow-sm transition-all dark:border-gray-700 dark:bg-gray-800"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    📢 {c.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_BADGE[c.status] ?? ""
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  {c.category} · {c._count.areas} areas · {c._count.contributions}{" "}
                  contributions
                </p>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
