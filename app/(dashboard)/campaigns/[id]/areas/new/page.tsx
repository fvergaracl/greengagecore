// Dashboard — Crear nueva área con mapa Leaflet interactivo.

"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

// Leaflet sólo en cliente (no SSR)
const AreaMapDrawer = dynamic(() => import("@/components/areas/AreaMapDrawer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
      <span className="text-sm text-gray-400">Loading map…</span>
    </div>
  ),
})

export default function NewAreaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!polygon) {
      setError("Please draw a polygon on the map.")
      return
    }
    if (!name.trim()) {
      setError("Name is required.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: params.id,
          name: name.trim(),
          description: description.trim() || undefined,
          polygonGeojson: polygon,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to create area")
      }

      router.push(`/dashboard/campaigns/${params.id}/areas`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/campaigns/${params.id}/areas`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Areas
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
          New Area
        </h1>
        <p className="text-sm text-gray-500">
          Draw a polygon on the map to define the geographic boundary for this area.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Map */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Polygon boundary <span className="text-red-500">*</span>
          </label>
          <AreaMapDrawer onPolygonChange={setPolygon} />
        </div>

        {/* Name + description */}
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
              placeholder="e.g. North Park Sector"
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
              placeholder="Optional description for contributors…"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>

        {/* GeoJSON preview */}
        {polygon && (
          <details className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/10">
            <summary className="cursor-pointer text-xs font-medium text-green-700 dark:text-green-400">
              ✅ Polygon captured — {polygon.coordinates[0].length - 1} vertices
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-white/60 p-2 text-xs text-gray-600 dark:bg-black/20 dark:text-gray-400">
              {JSON.stringify(polygon, null, 2)}
            </pre>
          </details>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !polygon || !name.trim()}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Creating…" : "Create area"}
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
