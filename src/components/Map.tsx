import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import L, { DivIcon } from "leaflet"
import "leaflet/dist/leaflet.css"
import { useDashboard } from "../context/DashboardContext"
import "./styles.css"

interface Point {
  latitud: number
  longitud: number
  titulo: string
  detalle: string
  tipo: string
  punto: string
}

interface PolygonData {
  coordinates: [number, number][] // Coordenadas del polígono
  score: number // Puntaje asociado al polígono
}

interface MapProps {
  puntos: Point[]
  poligonos: PolygonData[]
  selectedCampaign: { id: string; name: string } | null
}

const MapContainer = dynamic(
  () => import("react-leaflet").then(mod => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then(mod => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), {
  ssr: false
})
const Polygon = dynamic(
  () => import("react-leaflet").then(mod => mod.Polygon),
  { ssr: false }
)
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), {
  ssr: false
})

export default function Map({ puntos, poligonos, selectedCampaign }: MapProps) {
  const { mapCenter, setMapCenter, position, isTracking } = useDashboard()
  const [campaignData, setCampaignData] = useState<any>(null)

  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!selectedCampaign) return
      const res = await fetch(`/api/campaigns/${selectedCampaign?.id}`)
      const resJson = await res.json()

      setCampaignData(resJson)
    }

    fetchCampaignData()
  }, [selectedCampaign])

  useEffect(() => {
    if (position && !mapCenter) {
      setMapCenter(position)
    }
  }, [position, mapCenter, setMapCenter])

  const markerIcon = useMemo(() => {
    if (isTracking) {
      return new DivIcon({
        className: "blinking-marker-icon",
        html: `
          <div class="blinking-marker">
            <div class="inner-circle"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    } else {
      return new DivIcon({
        className: "static-marker-icon",
        html: `
          <div class="static-marker">
            <div class="inner-circle"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }
  }, [isTracking])

  return (
    <MapContainer
      center={mapCenter || [0, 0]}
      zoom={mapCenter ? 16 : 13}
      style={{ height: "100vh", width: "100%" }}
      data-cy='map-container-for-dashboard'
    >
      <TileLayer
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {poligonos.map((poligono, index) => (
        <Polygon
          key={index}
          positions={poligono.coordinates}
          pathOptions={{ color: "blue", weight: 2 }}
        />
      ))}
      {puntos.map((punto, index) => (
        <Marker
          key={index}
          position={[punto.latitud, punto.longitud]}
          icon={L.icon({
            iconUrl: "/marker-icon.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          })}
        />
      ))}
      {position && (
        <Marker position={[position.lat, position.lng]} icon={markerIcon}>
          <Popup>
            <h3>Tu posición actual</h3>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
