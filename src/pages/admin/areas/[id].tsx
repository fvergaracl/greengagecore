import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import axios from "axios"
import DefaultLayout from "../../../components/AdminLayout"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
import dynamic from "next/dynamic"
import { useTranslation } from "@/hooks/useTranslation"
import GoBack from "@/components/Admin/GoBack"

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

interface Area {
  id: string
  name: string
  description: string
  campaign: { id: string; name: string }
  isDisabled: boolean
  pointOfInterests: {
    id: string
    title: string
    tasks: { id: string; title: string }[]
  }[]
  polygon: [number, number][] | null
  tasks: { id: string; title: string }[]
  createdAt: string
  updatedAt: string
}

export default function AreaDetails() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = router.query
  const [area, setArea] = useState<Area | null>(null)

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

  if (!area) {
    return (
      <DefaultLayout>
        <div className='flex items-center justify-center h-screen'>
          <p className='text-gray-500 text-lg'>{t("Loading...")}</p>
        </div>
      </DefaultLayout>
    )
  }

  const polygonCoordinates = area?.polygon || []
  const bounds = polygonCoordinates?.length > 0 ? polygonCoordinates : [[0, 0]]
  return (
    <DefaultLayout>
      <Breadcrumb pageName={t("Area Details")} breadcrumbPath={t("Areas")} />
      <GoBack data-cy='go-back-area-details' />
      <div className='flex'>
        {/* Left Content */}
        <div className='flex-1 p-6 bg-white rounded-lg shadow-md dark:bg-gray-800'>
          <div className='mb-4 flex justify-between'>
            <button
              onClick={() =>
                router.push(`/admin/campaigns/${area.campaign.id}`)
              }
              className='px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
            >
              {t("View Parent Campaign")}
            </button>
            <button
              onClick={() => router.push(`/admin/areas/${area.id}/edit`)}
              className='px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
            >
              {t("Edit Area")}
            </button>
          </div>
          <h1 className='text-3xl font-bold text-gray-800 dark:text-white mb-4'>
            {area.name}
          </h1>
          <p className='text-gray-600 dark:text-gray-300 mb-6'>
            {area.description || t("No description available")}
          </p>
          <div className='mb-6'>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
              {t("Parent Campaign")}
            </h2>
            <p>
              <strong>{t("Name")}:</strong> {area.campaign.name}
            </p>
          </div>
          <div className='mb-6'>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
              {t("Details")}
            </h2>
            <p>
              <strong>{t("Status")}:</strong>{" "}
              <span
                className={`px-2 py-1 text-sm font-medium rounded ${
                  area.isDisabled
                    ? "bg-red-100 text-red-700 dark:bg-red-700 dark:text-white"
                    : "bg-green-100 text-green-700 dark:bg-green-700 dark:text-white"
                }`}
              >
                {area.isDisabled ? t("Disabled") : t("Active")}
              </span>
            </p>
            <p>
              <strong>{t("Created At")}:</strong>{" "}
              {new Date(area.createdAt).toLocaleDateString()}
            </p>
            <p>
              <strong>{t("Updated At")}:</strong>{" "}
              {new Date(area.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className='mb-6'>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
              {t("Tasks")}
            </h2>
            <ul className='list-disc pl-5 space-y-2'>
              {area?.pointOfInterests?.tasks?.map(task => (
                <li key={task.id} className='text-gray-600 dark:text-gray-300'>
                  {task.title}
                </li>
              ))}
              {area?.tasks?.length === 0 && (
                <li className='text-gray-600 dark:text-gray-300'>
                  {t("No tasks available for this area")}.
                </li>
              )}
            </ul>
          </div>
        </div>
        {/* Right Map */}
        <div className='w-1/2 p-6'>
          <h2 className='text-xl font-semibold text-gray-800 dark:text-white mb-4'>
            {t("Area Map")}
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
              {t("No polygon defined for this area")}.
            </p>
          )}
        </div>
      </div>
    </DefaultLayout>
  )
}
