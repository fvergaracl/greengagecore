import { useRouter } from "next/router"
import { useEffect, useState, useMemo } from "react"
import axios from "axios"
import dynamic from "next/dynamic"
import DefaultLayout from "../../../../components/AdminLayout"
import Breadcrumb from "../../../../components/Breadcrumbs/Breadcrumb"
import Swal from "sweetalert2"
// Dynamically import Leaflet components
const MapContainer = dynamic(
  () => import("react-leaflet").then(mod => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then(mod => mod.TileLayer),
  { ssr: false }
)
const Polygon = dynamic(
  () => import("react-leaflet").then(mod => mod.Polygon),
  { ssr: false }
)
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), {
  ssr: false
})

interface PointOfInterest {
  id: string
  latitude: number
  longitude: number
  disabled: boolean
}

interface Area {
  id: string
  name: string
  description: string
  campaign: { id: string; name: string }
  disabled: boolean
  polygon: [number, number][] | null
  pointOfInterests: PointOfInterest[]
  created_at: string
  updated_at: string
}

export default function AreaDetails() {
  const router = useRouter()
  const { id } = router.query
  const [area, setArea] = useState<Area | null>(null)
  const [selectedPOI, setSelectedPOI] = useState<PointOfInterest | null>(null)
  const Map = useMemo(
    () =>
      dynamic(() => import("../../../../components/Map"), {
        loading: () => <p>A map is loading</p>,
        ssr: false
      }),
    []
  )
  useEffect(() => {
    if (id) {
      const fetchAreaDetails = async () => {
        try {
          const response = await axios.get(`/api/admin/areas/${id}`)
          setArea(response.data)
        } catch (error) {
          console.error("Error fetching area details:", error)
        }
      }

      fetchAreaDetails()
    }
  }, [id])

  const handleAddPOI = (latitude: number, longitude: number) => {
    if (!area?.polygon) return

    const isInsidePolygon = require("point-in-polygon")
    if (isInsidePolygon([longitude, latitude], area.polygon)) {
      const newPOI: PointOfInterest = {
        id: `${Date.now()}`, // Temporary ID for the UI
        latitude,
        longitude,
        disabled: false
      }
      setArea(prev =>
        prev
          ? { ...prev, pointOfInterests: [...prev.pointOfInterests, newPOI] }
          : prev
      )
    } else {
      Swal.fire({
        title: "Invalid Location",
        text: "The POI must be inside the area polygon.",
        icon: "error"
      })
    }
  }

  const handleEditPOI = (
    poiId: string,
    latitude: number,
    longitude: number
  ) => {
    setArea(prev =>
      prev
        ? {
            ...prev,
            pointOfInterests: prev.pointOfInterests.map(poi =>
              poi.id === poiId ? { ...poi, latitude, longitude } : poi
            )
          }
        : prev
    )
  }

  const handleTogglePOI = (poiId: string) => {
    setArea(prev =>
      prev
        ? {
            ...prev,
            pointOfInterests: prev.pointOfInterests.map(poi =>
              poi.id === poiId ? { ...poi, disabled: !poi.disabled } : poi
            )
          }
        : prev
    )
  }

  const handleDeletePOI = (poiId: string) => {
    setArea(prev =>
      prev
        ? {
            ...prev,
            pointOfInterests: prev.pointOfInterests.filter(
              poi => poi.id !== poiId
            )
          }
        : prev
    )
  }

  const handleSavePOIs = async () => {
    if (!id) return

    try {
      const response = await axios.put(`/api/admin/areas/${id}/pois`, {
        pois: area?.pointOfInterests
      })
      Swal.fire({
        title: "Success",
        text: "POIs updated successfully.",
        icon: "success"
      })
      setArea(response.data)
    } catch (error) {
      console.error("Error saving POIs:", error)
      Swal.fire({
        title: "Error",
        text: "Failed to save POIs.",
        icon: "error"
      })
    }
  }

  if (!area) {
    return (
      <DefaultLayout>
        <div className='flex items-center justify-center h-screen'>
          <p className='text-gray-500 text-lg'>Loading...</p>
        </div>
      </DefaultLayout>
    )
  }

  const polygonCoordinates = area.polygon || []
  const bounds = polygonCoordinates.length > 0 ? polygonCoordinates : [[0, 0]]

  return (
    <DefaultLayout>
      <Breadcrumb pageName='Area Details' breadcrumbPath='Areas' />
      <div className='flex'>
        {/* Left Content */}
        <div className='flex-1 p-6 bg-white rounded-lg shadow-md dark:bg-gray-800'>
          <div className='mb-4 flex justify-between'>
            <button
              onClick={() => router.back()}
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
            >
              ← Back to Areas
            </button>
            <button
              onClick={() =>
                router.push(`/admin/campaigns/${area.campaign.id}`)
              }
              className='px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
            >
              View Parent Campaign
            </button>
          </div>
          <h1 className='text-3xl font-bold text-gray-800 dark:text-white mb-4'>
            {area.name}
          </h1>
          <p className='text-gray-600 dark:text-gray-300 mb-6'>
            {area.description || "No description available."}
          </p>
          <div className='mb-6'>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
              Points of Interest
            </h2>
            <ul className='list-disc pl-5 space-y-2'>
              {area.pointOfInterests.map(poi => (
                <li key={poi.id} className='text-gray-600 dark:text-gray-300'>
                  Latitude: {poi.latitude}, Longitude: {poi.longitude},{" "}
                  <strong>{poi.disabled ? "Disabled" : "Active"}</strong>
                  <button
                    onClick={() => handleTogglePOI(poi.id)}
                    className='ml-2 text-blue-600 hover:underline'
                  >
                    Toggle
                  </button>
                  <button
                    onClick={() => handleDeletePOI(poi.id)}
                    className='ml-2 text-red-600 hover:underline'
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={handleSavePOIs}
            className='px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700'
          >
            Save POIs
          </button>
        </div>
        {/* Right Map */}
        <div className='w-1/2 p-6'>
          <h2 className='text-xl font-semibold text-gray-800 dark:text-white mb-4'>
            Polygon Map
          </h2>
          {polygonCoordinates.length > 2 ? (
            <MapContainer
              bounds={bounds}
              style={{ height: "400px", width: "100%" }}
              onClick={e => handleAddPOI(e.latlng.lat, e.latlng.lng)}
            >
              <TileLayer
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Polygon
                positions={polygonCoordinates}
                pathOptions={{ color: "blue", fillOpacity: 0.3 }}
              />
              {area.pointOfInterests.map(poi => (
                <Marker
                  key={poi.id}
                  position={[poi.latitude, poi.longitude]}
                  draggable
                  eventHandlers={{
                    dragend: e => {
                      const { lat, lng } = e.target.getLatLng()
                      handleEditPOI(poi.id, lat, lng)
                    }
                  }}
                />
              ))}
            </MapContainer>
          ) : (
            <p className='text-gray-600 dark:text-gray-300'>
              No polygon defined for this area.
            </p>
          )}
        </div>
      </div>
    </DefaultLayout>
  )
}
