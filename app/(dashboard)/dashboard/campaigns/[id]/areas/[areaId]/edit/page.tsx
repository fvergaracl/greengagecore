// Dashboard — Editar área existente (nombre, descripción, polígono).

"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { polygonsOverlap } from "@/lib/geojson-overlap"

const AreaMapDrawer = dynamic(() => import("@/components/areas/AreaMapDrawer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
      <span className="text-sm text-gray-400">Loading map…</span>
    </div>
  ),
})

interface AreaData {
  id: string
  name: string
  description: string | null
  polygonGeojson: GeoJSON.Polygon
  isDisabled: boolean
  campaign: {
    id: string
    name: string
  }
}

export default function EditAreaPage() {
  const params = useParams<{ id: string; areaId: string }>()
  const router = useRouter()

  const [area, setArea] = useState<AreaData | null>(null)
  const [campaignAreas, setCampaignAreas] = useState<
    Array<{ id: string; name: string; polygonGeojson: GeoJSON.Polygon }>
  >([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isDisabled, setIsDisabled] = useState(false)
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const asPolygon = (value: unknown): GeoJSON.Polygon | null => {
      if (!value || typeof value !== "object") return null
      const candidate = value as { type?: unknown; coordinates?: unknown }
      if (candidate.type !== "Polygon" || !Array.isArray(candidate.coordinates)) return null
      return candidate as GeoJSON.Polygon
    }

    async function load() {
      try {
        const areaResponse = await fetch(`/api/areas/${params.areaId}`)
        if (!areaResponse.ok) throw new Error("Failed to load area data")

        const data = (await areaResponse.json()) as AreaData
        if (cancelled) return

        setArea(data)
        setName(data.name)
        setDescription(data.description ?? "")
        setIsDisabled(data.isDisabled)
        setPolygon(data.polygonGeojson)

        const campaignResponse = await fetch(`/api/campaigns/${params.id}`)
        if (!campaignResponse.ok) return
        const campaignData = (await campaignResponse.json()) as unknown
        if (cancelled || !campaignData || typeof campaignData !== "object") return

        const rawAreas = "areas" in campaignData ? (campaignData.areas as unknown) : null
        if (!Array.isArray(rawAreas)) return

        const parsed = rawAreas
          .map((raw) => {
            if (!raw || typeof raw !== "object") return null
            const candidate = raw as {
              id?: unknown
              name?: unknown
              polygonGeojson?: unknown
            }
            if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
              return null
            }
            const parsedPolygon = asPolygon(candidate.polygonGeojson)
            if (!parsedPolygon) return null
            return {
              id: candidate.id,
              name: candidate.name,
              polygonGeojson: parsedPolygon,
            }
          })
          .filter(
            (item): item is { id: string; name: string; polygonGeojson: GeoJSON.Polygon } =>
              item !== null
          )
          .filter((item) => item.id !== data.id)

        setCampaignAreas(parsed)
      } catch {
        if (!cancelled) setError("Failed to load area data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [params.areaId, params.id])

  const overlappingAreaNames = useMemo(() => {
    if (!polygon) return []
    return campaignAreas
      .filter((candidate) => polygonsOverlap(polygon, candidate.polygonGeojson))
      .map((candidate) => candidate.name)
  }, [campaignAreas, polygon])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Name is required."); return }

    setSubmitting(true)
    setError(null)

    try {
      const body: Record<string, unknown> = { name: name.trim(), isDisabled }
      if (description.trim()) body.description = description.trim()
      else body.description = null
      if (polygon) body.polygonGeojson = polygon

      const res = await fetch(`/api/areas/${params.areaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? "Failed to update area")
      }

      router.push(`/dashboard/campaigns/${params.id}/areas`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">Loading area…</div>
    )
  }

  if (!area) {
    return (
      <div className="py-16 text-center text-sm text-red-500">Area not found.</div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
            { href: "/dashboard/campaigns", label: "Campaigns", emoji: "📢" },
            {
              href: `/dashboard/campaigns/${params.id}`,
              label: area.campaign?.name ?? "Campaign",
              emoji: "📢",
            },
            { href: `/dashboard/campaigns/${params.id}/areas`, label: "Areas", emoji: "🗺️" },
            { label: area.name, emoji: "📍" },
            { label: "Edit", emoji: "✏️" },
          ]}
        />
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
          ✏️ Edit Area
        </h1>
        <p className="text-sm text-gray-500">
          Update the boundary polygon or metadata for this area.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Map */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Polygon boundary
          </label>
          <AreaMapDrawer
            onPolygonChange={setPolygon}
            initialPolygon={area.polygonGeojson}
            referenceAreas={campaignAreas}
            activeAreaId={area.id}
          />
          <p className="mt-2 text-xs text-gray-400">
            The current polygon is preloaded. Reset and redraw to change it, or leave as-is to keep the existing boundary.
          </p>
          {campaignAreas.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              Context: {campaignAreas.length} other area
              {campaignAreas.length === 1 ? "" : "s"} shown on map.
            </p>
          )}
        </div>

        {overlappingAreaNames.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            ⚠️ Overlap warning: this polygon overlaps with {overlappingAreaNames.join(", ")}.
            You can still save if this is intentional.
          </div>
        )}

        {/* Fields */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Area name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isDisabled}
              onChange={(e) => setIsDisabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Disable this area (contributors won&apos;t see it)
            </span>
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/dashboard/campaigns/${params.id}/areas`}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
