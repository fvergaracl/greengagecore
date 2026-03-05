// Dashboard — Create a task linked to a POI or an area (open task).
// Survey schema is designed with SurveyJS and stored in taskData.

import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { NewTaskFormClient } from "./task-form-client"

export const metadata = { title: "New Task — GreenCrowd" }

function asPolygon(value: unknown): GeoJSON.Polygon | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as { type?: unknown; coordinates?: unknown }
  if (candidate.type !== "Polygon") return null
  if (!Array.isArray(candidate.coordinates)) return null
  return candidate as GeoJSON.Polygon
}

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
          polygonGeojson: true,
          pointsOfInterest: {
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
              radiusMeters: true,
            },
          },
        },
      },
    },
  })
  if (!campaign) notFound()

  const areas = campaign.areas.map((area) => ({
    id: area.id,
    name: area.name,
    polygonGeojson: asPolygon(area.polygonGeojson),
  }))

  const pois = campaign.areas.flatMap((area) =>
    area.pointsOfInterest.map((poi) => ({
      id: poi.id,
      name: poi.name,
      areaId: area.id,
      areaName: area.name,
      latitude: poi.latitude,
      longitude: poi.longitude,
      radiusMeters: poi.radiusMeters,
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

      {areas.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
          <p className="font-medium">No areas yet</p>
          <p className="mt-1">
            Tasks need at least one area. Create an area first to enable POI tasks and OpenTasks.
          </p>
          <div className="mt-3">
            <Link
              href={`/dashboard/campaigns/${id}/areas`}
              className="text-sm font-medium text-amber-800 underline dark:text-amber-300"
            >
              Go to areas and create one
            </Link>
          </div>
        </div>
      ) : (
        <NewTaskFormClient campaignId={id} pois={pois} areas={areas} />
      )}
    </div>
  )
}
