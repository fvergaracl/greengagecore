// Dashboard — Areas list para una campaña.

import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const metadata = { title: "Areas — GreenCrowd" }

async function getCampaignAreas(campaignId: string, researcherId: string) {
  return prisma.campaign.findFirst({
    where: { id: campaignId, researcherId },
    include: {
      areas: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { tasks: true, pointsOfInterest: true } },
        },
      },
    },
  })
}

export default async function AreasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const campaign = await getCampaignAreas(id, session!.user!.id!)
  if (!campaign) notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/campaigns/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← {campaign.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Areas ({campaign.areas.length})
          </h1>
        </div>
        <Link
          href={`/dashboard/campaigns/${id}/areas/new`}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          + New area
        </Link>
      </div>

      {/* Areas list */}
      {campaign.areas.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <p className="text-gray-500">No areas yet.</p>
          <Link
            href={`/dashboard/campaigns/${id}/areas/new`}
            className="mt-2 inline-block text-sm text-green-600 underline"
          >
            Draw your first area on the map
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaign.areas.map((area) => (
            <div
              key={area.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    📍 {area.name}
                  </span>
                  {area.isDisabled && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                      disabled
                    </span>
                  )}
                </div>
                {area.description && (
                  <p className="mt-0.5 text-sm text-gray-500">{area.description}</p>
                )}
                <p className="mt-0.5 text-xs text-gray-400">
                  {area._count.tasks} tasks · {area._count.pointsOfInterest} POIs
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/campaigns/${id}/areas/${area.id}/pois`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  📌 POIs
                </Link>
                <Link
                  href={`/dashboard/campaigns/${id}/areas/${area.id}/edit`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Edit
                </Link>
                <DeleteAreaButton areaId={area.id} campaignId={id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Server Action delete inline
function DeleteAreaButton({
  areaId,
  campaignId,
}: {
  areaId: string
  campaignId: string
}) {
  async function deleteArea() {
    "use server"
    const { auth: getAuth } = await import("@/lib/auth")
    const { prisma: db } = await import("@/lib/db")
    const { redirect } = await import("next/navigation")
    const session = await getAuth()
    if (!session?.user?.id) redirect("/signin")
    await db.area.deleteMany({
      where: { id: areaId, campaign: { researcherId: session.user.id! } },
    })
    redirect(`/dashboard/campaigns/${campaignId}/areas`)
  }

  return (
    <form action={deleteArea}>
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
        onClick={(e) => {
          if (!confirm("Delete this area? This will also delete its tasks.")) {
            e.preventDefault()
          }
        }}
      >
        Delete
      </button>
    </form>
  )
}
