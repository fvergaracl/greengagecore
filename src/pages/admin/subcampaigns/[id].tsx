import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import axios from "axios"
import DefaultLayout from "../../../components/AdminLayout"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
import dynamic from "next/dynamic"

// Dynamically import Leaflet components
const MapContainer = dynamic(
  () => import("react-leaflet").then(mod => mod.MapContainer) as any,
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then(mod => mod.TileLayer) as any,
  { ssr: false }
)
const Polygon = dynamic(
  () => import("react-leaflet").then(mod => mod.Polygon) as any,
  { ssr: false }
)

interface SubCampaign {
  id: string
  name: string
  description: string
  campaign: { id: string; name: string } // Parent Campaign
  disabled: boolean
  polygon: { coordinates: [number, number][] } | null // Polygon for the subcampaign
  tasks: { id: string; title: string }[]
  created_at: string
  updated_at: string
}

export default function SubCampaignDetails() {
  const router = useRouter()
  const { id } = router.query
  const [subCampaign, setSubCampaign] = useState<SubCampaign | null>(null)
  const [polygonCenter, setPolygonCenter] = useState<[number, number]>([0, 0])
  const [zoomMap, setZoomMap] = useState(14)

  const zoomMapToBounds = (bounds: [[number, number], [number, number]]) => {
    const map = document.querySelector(".leaflet-container")
    if (!map) return

    const mapWidth = map.clientWidth
    const mapHeight = map.clientHeight

    const [southWest, northEast] = bounds
    const [minX, minY] = southWest
    const [maxX, maxY] = northEast

    const dx = maxX - minX
    const dy = maxY - minY

    const zoomX = dx
      ? Math.min(Math.floor(Math.log(mapWidth / dx) / Math.LN2), 18)
      : 18
    const zoomY = dy
      ? Math.min(Math.floor(Math.log(mapHeight / dy) / Math.LN2), 18)
      : 18

    const zoom = Math.min(zoomX, zoomY, 18)
    setZoomMap(zoom)
  }

  const getZoomAndCenter = (polygon: [number, number][]) => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    polygon?.forEach(([x, y]) => {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    })

    const bounds = [
      [minX, minY] as [number, number],
      [maxX, maxY] as [number, number]
    ]

    const center = [(minX + maxX) / 2, (minY + maxY) / 2]
    zoomMapToBounds(bounds)
    setPolygonCenter(center)
  }

  useEffect(() => {
    if (id) {
      const fetchSubCampaignDetails = async () => {
        try {
          const response = await axios.get(`/api/admin/subcampaigns/${id}`)
          setSubCampaign(response.data)
        } catch (error) {
          console.error("Error fetching sub-campaign details:", error)
        }
      }

      fetchSubCampaignDetails()
    }
  }, [id])

  useEffect(() => {
    if (subCampaign?.polygon) {
      getZoomAndCenter(subCampaign?.polygon)
    }
  }, [subCampaign])

  if (!subCampaign) {
    return (
      <DefaultLayout>
        <div className='flex items-center justify-center h-screen'>
          <p className='text-gray-500 text-lg'>Loading...</p>
        </div>
      </DefaultLayout>
    )
  }

  console.log({ poly: subCampaign.polygon })
  return (
    <DefaultLayout>
      <Breadcrumb
        pageName='SubCampaign Details'
        breadcrumbPath='SubCampaigns'
      />
      <div className='mx-auto p-6 bg-white rounded-lg shadow-md dark:bg-gray-800'>
        <div className='mb-4 flex justify-between'>
          <button
            onClick={() => router.back()}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
          >
            ← Back to SubCampaigns
          </button>
          <button
            onClick={() =>
              router.push(`/admin/campaigns/${subCampaign.campaign.id}`)
            }
            className='px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
          >
            View Parent Campaign
          </button>
          <button
            onClick={() =>
              router.push(`/admin/subcampaigns/${subCampaign.id}/edit`)
            }
            className='px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
          >
            Edit SubCampaign
          </button>
        </div>
        <h1 className='text-3xl font-bold text-gray-800 dark:text-white mb-4'>
          {subCampaign.name}
        </h1>
        <p className='text-gray-600 dark:text-gray-300 mb-6'>
          {subCampaign.description || "No description available."}
        </p>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
            Parent Campaign
          </h2>
          <p>
            <strong>Name:</strong> {subCampaign.campaign.name}
          </p>
        </div>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
            Details
          </h2>
          <p>
            <strong>Status:</strong>{" "}
            <span
              className={`px-2 py-1 text-sm font-medium rounded ${
                subCampaign.disabled
                  ? "bg-red-100 text-red-700 dark:bg-red-700 dark:text-white"
                  : "bg-green-100 text-green-700 dark:bg-green-700 dark:text-white"
              }`}
            >
              {subCampaign.disabled ? "Disabled" : "Active"}
            </span>
          </p>
          <p>
            <strong>Created At:</strong>{" "}
            {new Date(subCampaign.created_at).toLocaleDateString()}
          </p>
          <p>
            <strong>Updated At:</strong>{" "}
            {new Date(subCampaign.updated_at).toLocaleDateString()}
          </p>
        </div>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
            Tasks
          </h2>
          <ul className='list-disc pl-5 space-y-2'>
            {subCampaign.tasks.map(task => (
              <li key={task.id} className='text-gray-600 dark:text-gray-300'>
                {task.title}
              </li>
            ))}
          </ul>
        </div>
        <div className='mb-6'>
          <h2 className='mx-auto text-xl font-semibold text-gray-800 dark:text-white'>
            Polygon
          </h2>
          {subCampaign.polygon && subCampaign.polygon.length > 2 ? (
            <MapContainer
              center={polygonCenter}
              zoom={zoomMap}
              style={{ height: "400px", width: "100%" }}
            >
              <TileLayer
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Polygon
                positions={subCampaign.polygon}
                pathOptions={{ color: "blue", fillOpacity: 0.3 }}
              />
            </MapContainer>
          ) : (
            <p className='text-gray-600 dark:text-gray-300'>
              No polygon defined for this subcampaign.
            </p>
          )}
        </div>
      </div>
    </DefaultLayout>
  )
}
