import { useRouter } from "next/router"
import React, { useEffect, useMemo, useState } from "react"
import ReactDOMServer from "react-dom/server"
import {
  MapContainer as LeafletMapContainer,
  Circle,
  Tooltip,
  TileLayer,
  Marker,
  Polygon,
  Popup
} from "react-leaflet"
import L, { DivIcon } from "leaflet"
import CustomMarker from "../Mapmarker"
import "leaflet/dist/leaflet.css"
import { useDashboard, DashboardContextType } from "@/context/DashboardContext"
import { useAdmin, AdminContextType } from "@/context/AdminContext"
import MapControls from "./MapControls"
import FitBounds from "./FitBounds"
import "../styles.css"
import {
  Point,
  Task,
  PolygonData,
  CampaignData,
  PointOfInterest
} from "./types"

interface MapProps {
  showMyLocation?: boolean
  points: Point[]
  polygons: PolygonData[]
  polygonsMultiColors?: boolean
  polygonsTitle?: boolean
  polygonsFitBounds?: boolean
  clickOnPolygon?: (polygon: PolygonData) => void
  selectedCampaign: CampaignData | null
  modeView?: "contribuitor-view" | "admin-view"
  showMapControl?: boolean
}

type ContextType = {
  mapCenter: [number, number]
  position: { lat: number; lng: number } | null
  isTracking: boolean
}

export const useContextMapping = ():
  | DashboardContextType
  | AdminContextType
  | ContextType => {
  const router = useRouter()

  // Determinar el contexto según la ruta actual
  const isDashboard = router.pathname.startsWith("/dashboard")
  const isAdmin = router.pathname.startsWith("/admin")

  if (isAdmin) {
    return useAdmin()
  }

  if (isDashboard) {
    return useDashboard()
  }

  // Valores predeterminados si no coincide ninguna ruta
  return {
    mapCenter: [0, 0],
    position: null,
    isTracking: false
  }
}

const colors = [
  { border: "blue", fill: "lightblue" },
  { border: "red", fill: "pink" },
  { border: "green", fill: "lightgreen" },
  { border: "purple", fill: "plum" },
  { border: "orange", fill: "peachpuff" }
]

export default function Map({
  showMyLocation = false,
  points = [],
  polygons = [],
  polygonsMultiColors = true,
  polygonsTitle = false,
  polygonsFitBounds = false,
  clickOnPolygon = undefined,
  selectedCampaign,
  modeView = "contribuitor-view",
  showMapControl = false
}: MapProps) {
  const router = useRouter()
  // const { mapCenter, position, isTracking } = useDashboard()
  // const { mapCenter, position, isTracking } = useAdmin()

  const { mapCenter, position, isTracking } = useContextMapping(router)

  const [campaignData, setCampaignData] = useState<any>(null)
  const [selectedPoi, setSelectedPoi] = useState<any>(null)
  const [selectedPolygon, setSelectedPolygon] = useState<PolygonData | null>(
    null
  )

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

  const firstDivClassName =
    modeView === "contribuitor-view" ? "h-[calc(100vh-4rem)]" : "h-96"

  const secondDivClassName =
    modeView === "contribuitor-view"
      ? `${selectedPoi ? "h-[70%]" : "h-full"} transition-all duration-300`
      : "h-full"

  return (
    <>
      <div className={firstDivClassName} data-cy='map-container-for-dashboard'>
        <div className={secondDivClassName}>
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
            {showMapControl && (
              <MapControls position={position} campaignData={campaignData} />
            )}
            {polygons?.map((polygon, index) => {
              if (polygonsMultiColors) {
                const color = colors[index % colors.length] // Ciclar a través de los colores
                return (
                  <Polygon
                    key={polygon.id}
                    positions={polygon.polygon}
                    pathOptions={{
                      color: color.border,
                      fillColor: color.fill,
                      fillOpacity: 0.5
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedPolygon(polygon)
                        if (clickOnPolygon) clickOnPolygon(polygon)
                      }
                    }}
                  >
                    {polygonsTitle && <Tooltip>{polygon.name}</Tooltip>}
                    {selectedPolygon?.id === polygon.id && (
                      <Popup>
                        <div>
                          <h3>
                            <strong>Title:</strong>
                            {polygon.name}
                          </h3>
                          <p>
                            <strong>Description:</strong>
                            {polygon.description}
                          </p>
                          <button
                            onClick={() => {
                              router.push(`/admin/areas/${polygon.id}`)
                            }}
                            className='text-blue-600 underline'
                          >
                            See more
                          </button>
                        </div>
                      </Popup>
                    )}
                  </Polygon>
                )
              }
              return (
                <Polygon
                  key={index}
                  positions={polygon.coordinates}
                  pathOptions={{ color: "blue", weight: 2 }}
                />
              )
            })}
            {points?.map((point, index) => (
              <Marker
                key={index}
                position={[point.lat, point.lng]}
                icon={L.icon({
                  iconUrl: "/marker-icon.png",
                  iconSize: [25, 41],
                  iconAnchor: [12, 41]
                })}
              />
            ))}
            {campaignData?.areas.map(
              (area: {
                id: string
                name: string
                description: string
                polygon: [number, number][]
                pointOfInterests: any[]
              }) => (
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
              )
            )}
            {campaignData?.areas
              ?.flatMap(
                (area: { pointOfInterests: any }) => area?.pointOfInterests
              )
              .map((poi: PointOfInterest) => (
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
            {showMyLocation && position && (
              <Marker position={[position.lat, position.lng]} icon={markerIcon}>
                <Popup>
                  <h3>Your current location</h3>
                </Popup>
              </Marker>
            )}
            {polygonsFitBounds && mapCenter && (
              <FitBounds polygons={polygons} />
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
                  {selectedPoi.tasks.map((task: Task) => (
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
