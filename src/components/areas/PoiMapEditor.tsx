"use client"

// Mapa para gestionar POIs dentro de un área.
// Click en el mapa → añade POI en esa posición.
// Click en marcador existente → lo selecciona para editar/borrar.

import { useEffect, useRef } from "react"

export interface PoiMarker {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  isDisabled: boolean
}

interface Props {
  pois: PoiMarker[]
  areaPolygon?: GeoJSON.Polygon
  onMapClick: (lat: number, lng: number) => void
  onPoiClick: (poi: PoiMarker) => void
  selectedPoiId?: string | null
  editingPoiId?: string | null
  livePoi?: {
    latitude: number
    longitude: number
    radiusMeters: number
    name: string
  } | null
}

export default function PoiMapEditor({
  pois,
  areaPolygon,
  onMapClick,
  onPoiClick,
  selectedPoiId,
  editingPoiId,
  livePoi,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<{
    map: L.Map
    poiLayers: Map<string, L.CircleMarker>
    polygonLayer: L.Polygon | null
    circleLayer: L.Circle | null
    draftMarkerLayer: L.CircleMarker | null
  } | null>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    document.head.appendChild(link)

    import("leaflet").then((L) => {
      // Centro en centroide del polígono o en los POIs
      let center: L.LatLngExpression = [41.3851, 2.1734]
      let zoom = 14

      if (areaPolygon) {
        const coords = areaPolygon.coordinates[0]
        const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length
        const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length
        center = [avgLat, avgLng]
        zoom = 16
      } else if (pois.length > 0) {
        center = [pois[0].latitude, pois[0].longitude]
        zoom = 16
      }

      const map = L.map(mapRef.current!).setView(center, zoom)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 20,
      }).addTo(map)

      let polygonLayer: L.Polygon | null = null
      if (areaPolygon) {
        const latlngs = areaPolygon.coordinates[0].map(
          ([lng, lat]) => [lat, lng] as L.LatLngTuple
        )
        polygonLayer = L.polygon(latlngs, {
          color: "#16a34a",
          fillColor: "#4ade80",
          fillOpacity: 0.08,
          weight: 2,
          dashArray: "6 4",
        }).addTo(map)
      }

      leafletRef.current = {
        map,
        poiLayers: new Map(),
        polygonLayer,
        circleLayer: null,
        draftMarkerLayer: null,
      }

      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng)
      })
    })

    return () => {
      leafletRef.current?.map.remove()
      leafletRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sincronizar marcadores con estado
  useEffect(() => {
    if (!leafletRef.current) return
    import("leaflet").then((L) => {
      const { map, poiLayers } = leafletRef.current!

      // Eliminar marcadores que ya no existen
      for (const [id, marker] of poiLayers.entries()) {
        if (!pois.find((p) => p.id === id)) {
          marker.remove()
          poiLayers.delete(id)
        }
      }

      // Actualizar / añadir marcadores
      for (const poi of pois) {
        const isSelected = poi.id === selectedPoiId || poi.id === editingPoiId
        const lat = poi.id === editingPoiId && livePoi ? livePoi.latitude : poi.latitude
        const lng = poi.id === editingPoiId && livePoi ? livePoi.longitude : poi.longitude
        const color = poi.isDisabled
          ? "#9ca3af"
          : isSelected
            ? "#f59e0b"
            : "#2563eb"

        if (poiLayers.has(poi.id)) {
          const m = poiLayers.get(poi.id)!
          m.setLatLng([lat, lng])
          m.setStyle({ color, fillColor: color })
        } else {
          const marker = L.circleMarker([lat, lng], {
            radius: 8,
            color,
            fillColor: color,
            fillOpacity: 0.7,
            weight: 2,
          }).addTo(map)

          marker.bindTooltip(poi.name, { permanent: false, direction: "top" })
          marker.on("click", (e) => {
            L.DomEvent.stopPropagation(e)
            onPoiClick(poi)
          })

          poiLayers.set(poi.id, marker)
        }
      }

      // Limpiar capas de preview anteriores
      if (leafletRef.current!.draftMarkerLayer) {
        leafletRef.current!.draftMarkerLayer.remove()
        leafletRef.current!.draftMarkerLayer = null
      }
      if (leafletRef.current!.circleLayer) {
        leafletRef.current!.circleLayer.remove()
        leafletRef.current!.circleLayer = null
      }

      // En modo creación: mostrar marker + radio en vivo
      if (livePoi && !editingPoiId) {
        leafletRef.current!.draftMarkerLayer = L.circleMarker(
          [livePoi.latitude, livePoi.longitude],
          {
            radius: 8,
            color: "#f59e0b",
            fillColor: "#f59e0b",
            fillOpacity: 0.7,
            weight: 2,
          }
        )
          .addTo(map)
          .bindTooltip(livePoi.name, { permanent: false, direction: "top" })
      }

      // Mostrar radio del POI seleccionado o en edición/creación en vivo
      if (livePoi) {
        leafletRef.current!.circleLayer = L.circle(
          [livePoi.latitude, livePoi.longitude],
          {
            radius: livePoi.radiusMeters,
            color: "#f59e0b",
            fillColor: "#fef3c7",
            fillOpacity: 0.3,
            weight: 1.5,
          }
        ).addTo(map)
        return
      }

      const selected = pois.find((p) => p.id === selectedPoiId)
      if (selected) {
        leafletRef.current!.circleLayer = L.circle(
          [selected.latitude, selected.longitude],
          {
            radius: selected.radiusMeters,
            color: "#f59e0b",
            fillColor: "#fef3c7",
            fillOpacity: 0.3,
            weight: 1.5,
          }
        ).addTo(map)
      }
    })
  }, [pois, selectedPoiId, editingPoiId, livePoi, onPoiClick])

  return (
    <div
      ref={mapRef}
      className="h-80 w-full rounded-xl border border-gray-300 dark:border-gray-600"
      style={{ zIndex: 0 }}
    />
  )
}
