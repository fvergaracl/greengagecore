// Dashboard — Gestión de POIs (Points of Interest) dentro de un área.
// Click en el mapa añade un nuevo POI. Click en marcador existente lo edita.

"use client"

import dynamic from "next/dynamic"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { PoiMarker } from "@/components/areas/PoiMapEditor"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"

const PoiMapEditor = dynamic(() => import("@/components/areas/PoiMapEditor"), {
  ssr: false,
  loading: () => (
    <div className='flex h-80 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'>
      <span className='text-sm text-gray-400'>Loading map…</span>
    </div>
  )
})

interface AreaWithPois {
  id: string
  name: string
  campaignId: string
  campaign: {
    id: string
    name: string
  }
  polygonGeojson: GeoJSON.Polygon
  pointsOfInterest: PoiMarker[]
}

type FormMode = "idle" | "create" | "edit"

interface PoiForm {
  name: string
  description: string
  latitude: number | ""
  longitude: number | ""
  radiusMeters: number
}

const EMPTY_FORM: PoiForm = {
  name: "",
  description: "",
  latitude: "",
  longitude: "",
  radiusMeters: 100
}

function isPointInsideAreaPolygon(
  latitude: number,
  longitude: number,
  polygon?: GeoJSON.Polygon
): boolean {
  if (!polygon?.coordinates?.[0]?.length) return false
  const ring = polygon.coordinates[0]

  const isPointOnSegment = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const epsilon = 1e-10
    const cross = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1)
    if (Math.abs(cross) > epsilon) return false
    const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2)
    return dot <= epsilon
  }

  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]

    if (isPointOnSegment(longitude, latitude, xi, yi, xj, yj)) return true

    const intersects =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi

    if (intersects) inside = !inside
  }

  return inside
}

export default function PoisPage() {
  const params = useParams<{ id: string; areaId: string }>()

  const [area, setArea] = useState<AreaWithPois | null>(null)
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState<FormMode>("idle")
  const [form, setForm] = useState<PoiForm>(EMPTY_FORM)
  const [selectedPoi, setSelectedPoi] = useState<PoiMarker | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchArea() {
    const res = await fetch(`/api/areas/${params.areaId}`)
    if (!res.ok) return
    const data = await res.json()
    setArea(data)
  }

  useEffect(() => {
    fetchArea().finally(() => setLoading(false))
  }, [params.areaId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleMapClick(lat: number, lng: number) {
    if (formMode === "edit") return // No crear si estamos editando
    if (!isPointInsideAreaPolygon(lat, lng, area?.polygonGeojson)) {
      setError("POI center must be inside the area boundary.")
      return
    }
    setSelectedPoi(null)
    setForm({
      ...EMPTY_FORM,
      latitude: Math.round(lat * 1e6) / 1e6,
      longitude: Math.round(lng * 1e6) / 1e6
    })
    setFormMode("create")
    setError(null)
  }

  function handlePoiClick(poi: PoiMarker) {
    setSelectedPoi(poi)
    setForm({
      name: poi.name,
      description: "",
      latitude: poi.latitude,
      longitude: poi.longitude,
      radiusMeters: poi.radiusMeters
    })
    setFormMode("edit")
    setError(null)
  }

  async function handleSave() {
    if (!form.name.trim() || form.latitude === "" || form.longitude === "") {
      setError("Name and coordinates are required.")
      return
    }
    if (
      !isPointInsideAreaPolygon(
        Number(form.latitude),
        Number(form.longitude),
        area?.polygonGeojson
      )
    ) {
      setError("POI center must be inside the area boundary.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      let res: Response
      if (formMode === "create") {
        res = await fetch("/api/pois", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            areaId: params.areaId,
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
            radiusMeters: form.radiusMeters
          })
        })
      } else {
        res = await fetch(`/api/pois/${selectedPoi!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || null,
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
            radiusMeters: form.radiusMeters
          })
        })
      }

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? "Failed to save POI")
      }

      await fetchArea()
      setFormMode("idle")
      setSelectedPoi(null)
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedPoi) return
    if (
      !confirm(
        `Delete POI "${selectedPoi.name}"? This will also delete its tasks.`
      )
    )
      return

    setSaving(true)
    try {
      await fetch(`/api/pois/${selectedPoi.id}`, { method: "DELETE" })
      await fetchArea()
      setFormMode("idle")
      setSelectedPoi(null)
      setForm(EMPTY_FORM)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleDisable() {
    if (!selectedPoi) return
    setSaving(true)
    try {
      await fetch(`/api/pois/${selectedPoi.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !selectedPoi.isDisabled })
      })
      await fetchArea()
      setFormMode("idle")
      setSelectedPoi(null)
    } finally {
      setSaving(false)
    }
  }

  const pois: PoiMarker[] = area?.pointsOfInterest ?? []
  const livePoi =
    formMode !== "idle" && form.latitude !== "" && form.longitude !== ""
      ? {
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          radiusMeters: form.radiusMeters,
          name:
            form.name.trim() ||
            (formMode === "create" ? "New POI" : (selectedPoi?.name ?? "POI"))
        }
      : null
  const livePoiInsideArea = livePoi
    ? isPointInsideAreaPolygon(
        livePoi.latitude,
        livePoi.longitude,
        area?.polygonGeojson
      )
    : true

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <Breadcrumbs
            items={[
              { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
              { href: "/dashboard/campaigns", label: "Campaigns", emoji: "📢" },
              {
                href: `/dashboard/campaigns/${params.id}`,
                label: area?.campaign?.name ?? "Campaign",
                emoji: "📢"
              },
              {
                href: `/dashboard/campaigns/${params.id}/areas`,
                label: "Areas",
                emoji: "🗺️"
              },
              { label: area?.name ?? "Area", emoji: "📍" },
              { label: "POIs", emoji: "📌" }
            ]}
          />
          <h1 className='mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100'>
            📌 Points of Interest ({pois.length})
          </h1>
          <p className='text-sm text-gray-500'>
            Click on the map to add a POI. Click an existing marker to edit it.
          </p>
        </div>
      </div>

      {loading ? (
        <div className='py-12 text-center text-sm text-gray-400'>Loading…</div>
      ) : (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
          {/* Map */}
          <div className='lg:col-span-2'>
            <PoiMapEditor
              pois={pois}
              areaPolygon={area?.polygonGeojson}
              onMapClick={handleMapClick}
              onPoiClick={handlePoiClick}
              selectedPoiId={selectedPoi?.id}
              editingPoiId={
                formMode === "edit" ? (selectedPoi?.id ?? null) : null
              }
              livePoi={livePoi}
            />
            <p className='mt-2 text-xs text-gray-400'>
              🟢 Click on the map to place a new POI · 🔵 Blue = active · ⚫
              Gray = disabled · 🟡 Selected
            </p>
          </div>

          {/* Panel lateral: form o lista */}
          <div className='space-y-4'>
            {formMode === "idle" ? (
              /* POI list */
              <div className='space-y-2'>
                {pois.length === 0 ? (
                  <div className='rounded-xl border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400 dark:border-gray-700'>
                    No POIs yet. Click on the map to add one.
                  </div>
                ) : (
                  pois.map(poi => (
                    <button
                      key={poi.id}
                      onClick={() => handlePoiClick(poi)}
                      className='w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left hover:border-blue-300 hover:shadow-sm transition-all dark:border-gray-700 dark:bg-gray-800'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          📌 {poi.name}
                        </span>
                        {poi.isDisabled && (
                          <span className='rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600'>
                            disabled
                          </span>
                        )}
                      </div>
                      <p className='mt-0.5 text-xs text-gray-400'>
                        {poi.latitude.toFixed(5)}, {poi.longitude.toFixed(5)} ·
                        r={poi.radiusMeters}m
                      </p>
                    </button>
                  ))
                )}
              </div>
            ) : (
              /* Form */
              <div className='rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 space-y-4'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    {formMode === "create"
                      ? "New POI"
                      : `Edit: ${selectedPoi?.name}`}
                  </h3>
                  <button
                    onClick={() => {
                      setFormMode("idle")
                      setSelectedPoi(null)
                      setError(null)
                    }}
                    className='text-xs text-gray-400 hover:text-gray-600'
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-600 dark:text-gray-400'>
                    Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={e =>
                      setForm(f => ({ ...f, name: e.target.value }))
                    }
                    maxLength={120}
                    className='mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                  />
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-600 dark:text-gray-400'>
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e =>
                      setForm(f => ({ ...f, description: e.target.value }))
                    }
                    rows={2}
                    className='mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                  />
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label className='block text-xs font-medium text-gray-600 dark:text-gray-400'>
                      Latitude *
                    </label>
                    <input
                      type='number'
                      step='0.000001'
                      value={form.latitude}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          latitude: parseFloat(e.target.value) || ""
                        }))
                      }
                      className='mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-600 dark:text-gray-400'>
                      Longitude *
                    </label>
                    <input
                      type='number'
                      step='0.000001'
                      value={form.longitude}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          longitude: parseFloat(e.target.value) || ""
                        }))
                      }
                      className='mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-600 dark:text-gray-400'>
                    Activation radius (meters): {form.radiusMeters}m
                  </label>
                  <input
                    type='range'
                    min={1}
                    max={200}
                    value={form.radiusMeters}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        radiusMeters: parseInt(e.target.value)
                      }))
                    }
                    className='mt-1 w-full accent-green-600'
                  />
                  <div className='flex justify-between text-xs text-gray-400'>
                    <span>1m</span>
                    <span>200m</span>
                  </div>
                </div>

                {error && (
                  <p className='rounded bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400'>
                    {error}
                  </p>
                )}
                {livePoi && !livePoiInsideArea && !error && (
                  <p className='rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'>
                    POI center must be inside the area boundary.
                  </p>
                )}

                <div className='flex gap-2'>
                  <button
                    onClick={handleSave}
                    disabled={saving || (livePoi ? !livePoiInsideArea : false)}
                    className='flex-1 rounded-lg bg-green-600 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {saving ? "…" : formMode === "create" ? "Add POI" : "Save"}
                  </button>
                  {formMode === "edit" && (
                    <>
                      <button
                        onClick={handleToggleDisable}
                        disabled={saving}
                        className='rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400'
                      >
                        {selectedPoi?.isDisabled ? "Enable" : "Disable"}
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={saving}
                        className='rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400'
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
