// Dashboard — Create task linked to a POI in a campaign.
// Survey schema is designed with SurveyJS and stored in taskData.

import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { NewTaskFormClient } from "./task-form-client"

export const metadata = { title: "New Task — GreenCrowd" }

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  const campaign = await prisma.campaign.findFirst({
    where: { id, researcherId: session!.user!.id! },
    include: {
      areas: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          pointsOfInterest: {
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          },
        },
      },
    },
  })
  if (!campaign) notFound()

  const pois = campaign.areas.flatMap((area) =>
    area.pointsOfInterest.map((poi) => ({
      id: poi.id,
      name: poi.name,
      areaId: area.id,
      areaName: area.name
    }))
  )

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
          { href: "/dashboard/campaigns", label: "Campaigns", emoji: "📢" },
          { href: `/dashboard/campaigns/${id}`, label: campaign.name, emoji: "📢" },
          { label: "New task", emoji: "🧩" },
        ]}
      />
      <h1 className="mb-6 mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
        🧩 New Task
      </h1>

      {pois.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
          <p className="font-medium">No POIs yet</p>
          <p className="mt-1">
            Tasks are linked to POIs. Create at least one POI before adding tasks.
          </p>
          <div className="mt-3">
            <Link
              href={`/dashboard/campaigns/${id}/areas`}
              className="text-sm font-medium text-amber-800 underline dark:text-amber-300"
            >
              Go to areas and create a POI
            </Link>
          </div>
        </div>
      ) : (
        <NewTaskFormClient campaignId={id} pois={pois} />
      )}
    </div>
  )
}
