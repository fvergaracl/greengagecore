import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import ReactDOMServer from "react-dom/server"
import { Circle } from "react-leaflet"
import L, { DivIcon } from "leaflet"
import CustomMarker from "./marker"
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

  const createCustomIcon = (color: string, size: number) => {
    const markerHtml = ReactDOMServer.renderToString(
      <CustomMarker markerColor={color} size={size} />
    )

    return L.divIcon({
      html: markerHtml,
      className: "custom-marker",
      iconSize: [size, size],
      iconAnchor: [size / 2, size]
    })
  }

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

      {campaignData?.areas.map(area => (
        <Polygon
          key={area.id}
          positions={area.polygon}
          pathOptions={{ color: "blue", weight: 2 }}
        >
          <Popup>
            <h3>{area.name}</h3>
            <p>{area.description}</p>
          </Popup>
        </Polygon>
      ))}
      {campaignData?.areas
        ?.flatMap(area => area?.pointOfInterests)
        .map(poi => (
          <>
            {/* Draw the radius */}
            <Circle
              key={`${poi.id}-circle`}
              center={[poi.latitude, poi.longitude]}
              radius={poi.radius}
              pathOptions={{ color: "green", fillOpacity: 0.2 }}
            />

            {/* Marker for POI */}
            <Marker
              key={poi.id}
              position={[poi.latitude, poi.longitude]}
              icon={createCustomIcon("green", 36)}
            >
              <Popup>
                <div className='p-4'>
                  <h4 className='text-lg font-bold text-gray-800'>
                    {poi.name}
                  </h4>
                  <p className='text-sm text-gray-600'>{poi.description}</p>

                  {poi.tasks.length > 0 && (
                    <div className='mt-4'>
                      <h4 className='text-md font-semibold text-gray-800 mb-2'>
                        Tasks
                      </h4>
                      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                        {poi.tasks.map(task => (
                          <div
                            key={task.id}
                            className='p-3 border rounded-lg shadow bg-white dark:bg-gray-800 dark:border-gray-700'
                          >
                            <h5 className='text-md font-semibold text-blue-600'>
                              <a
                                href={`/tasks/${task.id}`}
                                className='hover:underline'
                              >
                                {task.title}
                              </a>
                            </h5>
                            <p className='text-sm text-gray-500 mt-1'>
                              {task.description || "No description available"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
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
