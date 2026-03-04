"use client"

// Componente Leaflet para dibujar polígonos de área.
// Requiere: npm install leaflet
// Importar dinámicamente con ssr:false desde la página padre.

import { useEffect, useRef, useState } from "react"

type LngLat = [number, number]

interface Props {
  onPolygonChange: (geojson: GeoJSON.Polygon | null) => void
  initialCenter?: LngLat
  /** Polígono existente a cargar (modo edición). Los vértices se precargan en el mapa. */
  initialPolygon?: GeoJSON.Polygon
}

export default function AreaMapDrawer({ onPolygonChange, initialCenter, initialPolygon }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<{
    map: L.Map
    polygon: L.Polygon | null
    markers: L.Marker[]
  } | null>(null)

  // Si hay polígono inicial, pre-cargar sus puntos (sin el último punto de cierre)
  const initPoints = (): LngLat[] => {
    if (!initialPolygon) return []
    const ring = initialPolygon.coordinates[0]
    return ring.slice(0, -1) as LngLat[]
  }

  const [points, setPoints] = useState<LngLat[]>(initPoints)
  const [closed, setClosed] = useState(!!initialPolygon)
  const closedRef = useRef(!!initialPolygon)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    // Leaflet CSS
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    document.head.appendChild(link)

    import("leaflet").then((L) => {
      // Centro: centroide del polígono inicial si existe, si no usar initialCenter o Barcelona
      let center: L.LatLngExpression = initialCenter
        ? [initialCenter[1], initialCenter[0]]
        : [41.3851, 2.1734]
      let zoom = 13

      if (initialPolygon) {
        const coords = initialPolygon.coordinates[0]
        const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length
        const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length
        center = [avgLat, avgLng]
        zoom = 15
      }

      const map = L.map(mapRef.current!).setView(center, zoom)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map)

      leafletRef.current = { map, polygon: null, markers: [] }

      map.on("click", (e: L.LeafletMouseEvent) => {
        setPoints((prev) => {
          if (closedRef.current) return prev
          return [...prev, [e.latlng.lng, e.latlng.lat] as LngLat]
        })
      })
    })

    return () => {
      leafletRef.current?.map.remove()
      leafletRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Actualizar mapa cuando cambian puntos
  useEffect(() => {
    if (!leafletRef.current) return
    import("leaflet").then((L) => {
      const { map, markers } = leafletRef.current!

      // Limpiar marcadores previos
      markers.forEach((m) => m.remove())
      leafletRef.current!.markers = []

      // Limpiar polígono previo
      if (leafletRef.current!.polygon) {
        leafletRef.current!.polygon.remove()
        leafletRef.current!.polygon = null
      }

      if (points.length === 0) {
        onPolygonChange(null)
        return
      }

      // Añadir marcadores
      const newMarkers = points.map(([lng, lat], i) => {
        const marker = L.circleMarker([lat, lng], {
          radius: 6,
          color: i === 0 ? "#16a34a" : "#2563eb",
          fillColor: i === 0 ? "#4ade80" : "#60a5fa",
          fillOpacity: 0.8,
          weight: 2,
        }).addTo(map)
        return marker
      })
      leafletRef.current!.markers = newMarkers

      // Dibujar línea/polígono
      const latlngs = points.map(([lng, lat]) => [lat, lng] as L.LatLngTuple)

      if (closed && points.length >= 3) {
        const poly = L.polygon(latlngs, {
          color: "#16a34a",
          fillColor: "#4ade80",
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map)
        leafletRef.current!.polygon = poly

        // Emitir GeoJSON
        const ring: LngLat[] = [...points, points[0]]
        onPolygonChange({ type: "Polygon", coordinates: [ring] })
      } else {
        if (points.length > 1) {
          const polyline = L.polyline(latlngs, { color: "#2563eb", weight: 2 }).addTo(map)
          leafletRef.current!.polygon = polyline as unknown as L.Polygon
        }
        onPolygonChange(null)
      }
    })
  }, [points, closed]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    if (points.length >= 3) {
      setClosed(true)
      closedRef.current = true
    }
  }

  function handleReset() {
    setPoints([])
    setClosed(false)
    closedRef.current = false
    onPolygonChange(null)
  }

  function handleUndo() {
    if (closed) {
      setClosed(false)
      closedRef.current = false
    } else {
      setPoints((prev) => prev.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="h-80 w-full rounded-xl border border-gray-300 dark:border-gray-600"
        style={{ zIndex: 0 }}
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">
          {closed
            ? `✅ Polygon closed (${points.length} vertices)`
            : points.length === 0
              ? "Click on the map to add vertices"
              : `${points.length} vertices — ${points.length >= 3 ? 'click "Close" to finish' : "add at least 3 vertices"}`}
        </span>
        <div className="ml-auto flex gap-2">
          {points.length > 0 && !closed && (
            <button
              type="button"
              onClick={handleUndo}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ↩ Undo
            </button>
          )}
          {points.length >= 3 && !closed && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              Close polygon
            </button>
          )}
          {points.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
