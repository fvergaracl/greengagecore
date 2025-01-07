import dynamic from "next/dynamic"
import { useEffect, useMemo, useState, useRef } from "react"
import ReactDOMServer from "react-dom/server"
import { Circle } from "react-leaflet"
import L, { DivIcon } from "leaflet"
import CustomMarker from "./marker"
import { FiMapPin } from "react-icons/fi"
import { TbLassoPolygon } from "react-icons/tb"
import "leaflet/dist/leaflet.css"
import { useDashboard } from "../context/DashboardContext"
import "./styles.css"
import { MapContainer as LeafletMapContainer, useMap } from "react-leaflet"
interface Point {
  latitud: number
  longitud: number
  titulo: string
  detalle: string
  tipo: string
  punto: string
}

interface PolygonData {
  coordinates: [number, number][]
  score: number
}

interface MapProps {
  puntos: Point[]
  poligonos: PolygonData[]
  selectedCampaign: { id: string; name: string } | null
}

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

const MapControls = ({ position, campaignData }: any) => {
  const map = useMap()

  const focusOnCurrentLocation = () => {
    if (position) {
      map.setView([position.lat, position.lng], 16)
      console.log("Focusing on current location:", position)
    } else {
      console.warn("Position is not available.")
    }
  }

  const focusOnCampaign = () => {
    if (campaignData?.areas) {
      const bounds = L.latLngBounds([])
      campaignData.areas.forEach((area: any) => {
        area.polygon.forEach(([lat, lng]: [number, number]) => {
          bounds.extend([lat, lng])
        })
      })
      map.fitBounds(bounds)
      console.log("Focusing on campaign area.")
    } else {
      console.warn("Campaign data is not available.")
    }
  }

  return (
    <div className='absolute bottom-4 right-4 z-99999 flex flex-col gap-2'>
      <button
        onClick={focusOnCampaign}
        className={`p-3 ${
          campaignData?.areas
            ? "bg-green-500 hover:bg-green-600"
            : "bg-gray-300"
        } text-white rounded-full shadow-md focus:outline-none`}
        title='Enfocar campaña'
        disabled={!campaignData?.areas}
      >
        <TbLassoPolygon size={24} />
      </button>
      <button
        onClick={focusOnCurrentLocation}
        className={`p-3 ${
          position ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-300"
        } text-white rounded-full shadow-md focus:outline-none`}
        title='Mi ubicación'
        disabled={!position}
      >
        <FiMapPin size={24} />
      </button>
    </div>
  )
}

export default function MapDashboard({
  puntos,
  poligonos,
  selectedCampaign
}: MapProps) {
  const { mapCenter, setMapCenter, position, isTracking } = useDashboard()
  const mapRef = useRef<L.Map | null>(null)
  const [campaignData, setCampaignData] = useState<any>(null)
  const [selectedPoi, setSelectedPoi] = useState<any>(null)

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
    <>
      <div className='h-[calc(100vh-4rem)]'>
        <div
          className={`${
            selectedPoi ? "h-[70%]" : "h-full"
          } transition-all duration-300`}
        >
          <LeafletMapContainer
            center={mapCenter || [0, 0]}
            zoom={mapCenter ? 16 : 13}
            style={{ height: "100%", width: "100%" }}
            data-cy='map-container-for-dashboard'
          >
            <TileLayer
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapControls position={position} campaignData={campaignData} />
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
                  <Circle
                    key={`${poi.id}-circle`}
                    center={[poi.latitude, poi.longitude]}
                    radius={poi.radius}
                    pathOptions={{ color: "green", fillOpacity: 0.2 }}
                    eventHandlers={{
                      click: () => {
                        if (selectedPoi) {
                          setSelectedPoi(null)
                          return
                        }
                        setSelectedPoi(poi)
                      }
                    }}
                  />
                  <Marker
                    key={poi.id}
                    position={[poi.latitude, poi.longitude]}
                    icon={createCustomIcon("green", 36)}
                    eventHandlers={{
                      click: () => {
                        if (selectedPoi) {
                          setSelectedPoi(null)
                          return
                        }
                        setSelectedPoi(poi)
                      }
                    }}
                  ></Marker>
                </>
              ))}

            {position && (
              <Marker position={[position.lat, position.lng]} icon={markerIcon}>
                <Popup>
                  <h3>Your current location</h3>
                </Popup>
              </Marker>
            )}
          </LeafletMapContainer>
        </div>
        {selectedPoi && (
          <div className='h-[30%] overflow-y-auto bg-white dark:bg-gray-900 shadow-lg rounded-lg p-4'>
            <h4 className='text-lg font-bold text-slate-800'>
              {selectedPoi.name}
            </h4>
            <p className='text-sm text-slate-600'>{selectedPoi.description}</p>
            {selectedPoi.tasks.length > 0 && (
              <div className='mt-4'>
                <h4 className='text-md font-semibold text-white-800 mb-2'>
                  Tasks
                </h4>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                  {selectedPoi.tasks.map(task => (
                    <div
                      key={task.id}
                      className='p-3 border rounded-lg shadow bg-white dark:bg-gray-800 dark:border-gray-700'
                    >
                      <h5 className='text-md font-semibold text-blue-600'>
                        <a
                          href={`/dashboard/task/${task.id}`}
                          className='hover:underline'
                        >
                          {task.title}
                        </a>
                      </h5>
                      <p className='text-sm text-slate-500 mt-1'>
                        {task.description || "No description available"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
