import { useEffect, useState } from "react"
import axios from "axios"
import { useRouter } from "next/router"
import DefaultLayout from "../../../components/AdminLayout"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
import CustomMarker from "../../../components/marker"
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet"
import ReactDOMServer from "react-dom/server"
import "leaflet/dist/leaflet.css"

interface POI {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
  radius: number
  area: { id: string; name: string }
  createdAt: string
  updatedAt: string
}

export default function POIList() {
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchPOIs = async () => {
      setLoading(true)
      try {
        const response = await axios.get("/api/admin/pois")
        setPois(response.data)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching POIs:", err)
        setError("Failed to load POIs. Please try again later.")
        setLoading(false)
      }
    }

    fetchPOIs()
  }, [])

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

  const handleCreateNewTask = (id: string) => {
    router.push(`/admin/tasks/new?poiId=${id}`)
  }

  if (loading) {
    return (
      <DefaultLayout>
        <div className='flex items-center justify-center h-screen'>
          <p className='text-gray-500 text-lg'>Loading...</p>
        </div>
      </DefaultLayout>
    )
  }

  if (error) {
    return (
      <DefaultLayout>
        <div className='flex items-center justify-center h-screen'>
          <p className='text-red-500 text-lg'>{error}</p>
        </div>
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout>
      <Breadcrumb pageName='Points of Interest' breadcrumbPath='POIs' />
      <div className='p-6'>
        <div className=' gap-6'>
          {pois.map(poi => (
            <div
              key={poi.id}
              className='bg-white rounded-lg shadow-md dark:bg-gray-800 p-4'
            >
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white mb-2'>
                {poi.name}
              </h2>
              <p className='text-gray-600 dark:text-gray-300 mb-2'>
                {poi.description || "No description available."}
              </p>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-2'>
                Area: {poi.area.name}
              </p>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
                Created At: {new Date(poi.createdAt).toLocaleDateString()}
              </p>
              <div className='h-96 w-full mb-4'>
                <MapContainer
                  center={[poi.latitude, poi.longitude]}
                  zoom={16}
                  className='h-full rounded-md'
                >
                  <TileLayer
                    url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker
                    position={[poi.latitude, poi.longitude]}
                    icon={createCustomIcon("blue", 36)}
                  />
                  <Circle
                    center={[poi.latitude, poi.longitude]}
                    radius={poi.radius}
                    pathOptions={{ color: "blue", fillOpacity: 0.2 }}
                  />
                </MapContainer>
              </div>
              <button
                onClick={() => handleCreateNewTask(poi.id)}
                className='w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
              >
                Create Task
              </button>
            </div>
          ))}
        </div>
      </div>
    </DefaultLayout>
  )
}
