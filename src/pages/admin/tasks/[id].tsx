import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import axios from "axios"
import DefaultLayout from "../../../components/AdminLayout"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
import dynamic from "next/dynamic"

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

interface SubCampaign {
  id: string
  name: string
  description: string
  campaign: { id: string; name: string }
  disabled: boolean
  polygon: [number, number][] | null
  tasks: { id: string; title: string }[]
  created_at: string
  updated_at: string
}

export default function SubCampaignDetails() {
  const router = useRouter()
  const { id } = router.query
  const [subCampaign, setSubCampaign] = useState<SubCampaign | null>(null)

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

  if (!subCampaign) {
    return (
      <DefaultLayout>
        <div className='flex items-center justify-center h-screen'>
          <p className='text-gray-500 text-lg'>Loading...</p>
        </div>
      </DefaultLayout>
    )
  }

  const polygonCoordinates = subCampaign.polygon || []
  const bounds = polygonCoordinates.length > 0 ? polygonCoordinates : [[0, 0]]

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName='SubCampaign Details'
        breadcrumbPath='SubCampaigns'
      />
      <div className='flex'>
        {/* Left Content */}
        <div className='flex-1 p-6 bg-white rounded-lg shadow-md dark:bg-gray-800'>
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
            >
              <TileLayer
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Polygon
                positions={polygonCoordinates}
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