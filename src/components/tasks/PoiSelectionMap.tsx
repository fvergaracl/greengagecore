"use client"

import { useEffect, useRef } from "react"

export interface TaskPoiMapArea {
  id: string
  name: string
  polygonGeojson?: GeoJSON.Polygon | null
}

export interface TaskPoiMapPoi {
  id: string
  name: string
  areaId: string
  areaName: string
  latitude: number
  longitude: number
  radiusMeters: number
}

export type TaskAssignmentScope = "poi" | "area"

interface Props {
  areas: TaskPoiMapArea[]
  pois: TaskPoiMapPoi[]
  selectionMode?: TaskAssignmentScope
  selectedPoiId?: string | null
  selectedAreaId?: string | null
  onPoiSelect?: (poiId: string) => void
  onAreaSelect?: (areaId: string) => void
}

function getAreaRing(area: TaskPoiMapArea): [number, number][] {
  const ring = area.polygonGeojson?.coordinates?.[0]
  if (!ring || ring.length < 3) return []
  return ring.map(([lng, lat]) => [lat, lng])
}

export default function PoiSelectionMap({
  areas,
  pois,
  selectionMode = "poi",
  selectedPoiId,
  selectedAreaId,
  onPoiSelect,
  onAreaSelect,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<{
    map: L.Map
    areaLayers: Map<string, L.Polygon>
    poiLayers: Map<string, L.CircleMarker>
    selectedRadiusLayer: L.Circle | null
  } | null>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    document.head.appendChild(link)

    import("leaflet").then((L) => {
      let center: L.LatLngExpression = [40.4168, -3.7038]
      let zoom = 6

      const firstPoi = pois[0]
      if (firstPoi) {
        center = [firstPoi.latitude, firstPoi.longitude]
        zoom = 15
      } else {
        const firstRing = areas.map(getAreaRing).find((coords) => coords.length > 0)
        if (firstRing) {
          const avgLat = firstRing.reduce((acc, [lat]) => acc + lat, 0) / firstRing.length
          const avgLng = firstRing.reduce((acc, [, lng]) => acc + lng, 0) / firstRing.length
          center = [avgLat, avgLng]
          zoom = 14
        }
      }

      const map = L.map(mapRef.current!).setView(center, zoom)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 20,
      }).addTo(map)

      leafletRef.current = {
        map,
        areaLayers: new Map(),
        poiLayers: new Map(),
        selectedRadiusLayer: null,
      }
    })

    return () => {
      leafletRef.current?.map.remove()
      leafletRef.current = null
    }
  }, [areas, pois])

  useEffect(() => {
    if (!leafletRef.current) return
    import("leaflet").then((L) => {
      const state = leafletRef.current
      if (!state) return

      const selectedPoi = pois.find((poi) => poi.id === selectedPoiId) ?? null
      const effectiveSelectedAreaId =
        selectionMode === "area" ? (selectedAreaId ?? null) : (selectedPoi?.areaId ?? null)

      for (const layer of state.areaLayers.values()) layer.remove()
      state.areaLayers.clear()
      for (const layer of state.poiLayers.values()) layer.remove()
      state.poiLayers.clear()
      if (state.selectedRadiusLayer) {
        state.selectedRadiusLayer.remove()
        state.selectedRadiusLayer = null
      }

      for (const area of areas) {
        const ring = getAreaRing(area)
        if (ring.length === 0) continue

        const isSelectedArea = area.id === effectiveSelectedAreaId
        const layer = L.polygon(ring, {
          color: isSelectedArea ? "#f59e0b" : "#16a34a",
          fillColor: isSelectedArea ? "#fde68a" : "#4ade80",
          fillOpacity: isSelectedArea ? 0.2 : 0.08,
          weight: isSelectedArea ? 3 : 2,
          dashArray: isSelectedArea ? undefined : "6 4",
        }).addTo(state.map)

        layer.bindTooltip(`🗺️ ${area.name}`, { sticky: true })
        layer.on("click", (event) => {
          L.DomEvent.stopPropagation(event)
          onAreaSelect?.(area.id)
        })
        state.areaLayers.set(area.id, layer)
      }

      for (const poi of pois) {
        const isAreaMode = selectionMode === "area"
        const isSelectedPoi = !isAreaMode && poi.id === selectedPoiId
        const color = isAreaMode ? "#9ca3af" : isSelectedPoi ? "#f59e0b" : "#2563eb"
        const fillOpacity = isAreaMode ? 0.4 : 0.75
        const radius = isAreaMode ? 6 : 8

        const marker = L.circleMarker([poi.latitude, poi.longitude], {
          radius,
          color,
          fillColor: color,
          fillOpacity,
          weight: 2,
        }).addTo(state.map)

        if (!isAreaMode) {
          marker.bindTooltip(`📌 ${poi.name} · ${poi.areaName}`, {
            permanent: false,
            direction: "top",
          })
        }
        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event)
          if (selectionMode === "poi") {
            onPoiSelect?.(poi.id)
          } else {
            onAreaSelect?.(poi.areaId)
          }
        })

        state.poiLayers.set(poi.id, marker)
      }

      if (selectionMode === "poi" && selectedPoi) {
        state.selectedRadiusLayer = L.circle(
          [selectedPoi.latitude, selectedPoi.longitude],
          {
            radius: selectedPoi.radiusMeters,
            color: "#f59e0b",
            fillColor: "#fef3c7",
            fillOpacity: 0.3,
            weight: 1.5,
          }
        ).addTo(state.map)
      }

      if (selectionMode === "poi" && selectedPoi) {
        state.map.setView([selectedPoi.latitude, selectedPoi.longitude], 16)
        return
      }

      if (selectionMode === "area" && effectiveSelectedAreaId) {
        const selectedAreaLayer = state.areaLayers.get(effectiveSelectedAreaId)
        if (selectedAreaLayer) {
          state.map.fitBounds(selectedAreaLayer.getBounds().pad(0.2), { maxZoom: 16 })
          return
        }
      }

      const bounds = L.latLngBounds([])
      for (const layer of state.areaLayers.values()) bounds.extend(layer.getBounds())
      for (const layer of state.poiLayers.values()) bounds.extend(layer.getLatLng())
      if (state.selectedRadiusLayer) bounds.extend(state.selectedRadiusLayer.getBounds())

      if (bounds.isValid()) {
        state.map.fitBounds(bounds.pad(0.15), { maxZoom: 16 })
      }
    })
  }, [
    areas,
    pois,
    selectionMode,
    selectedPoiId,
    selectedAreaId,
    onPoiSelect,
    onAreaSelect,
  ])

  return (
    <div
      ref={mapRef}
      className="h-80 w-full rounded-xl border border-gray-300 dark:border-gray-600"
      style={{ zIndex: 0 }}
    />
  )
}
