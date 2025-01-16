import { useEffect, useState } from "react"
import axios from "axios"
import dynamic from "next/dynamic"
import { useRouter } from "next/router"
import DefaultLayout from "@/components/AdminLayout"
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb"
import GoBack from "@/components/Admin/GoBack"
import CustomMarker from "../../../components/marker"
import ReactDOMServer from "react-dom/server"
import "leaflet/dist/leaflet.css"
import { useTranslation } from "@/hooks/useTranslation"

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
const Circle = dynamic(() => import("react-leaflet").then(mod => mod.Circle), {
  ssr: false
})

const L = typeof window !== "undefined" ? require("leaflet") : null

interface SurveyElement {
  name: string
  type: string
  title: string
}

interface SurveyPage {
  name: string
  elements: SurveyElement[]
}

interface TaskData {
  pages: SurveyPage[]
}

interface Task {
  id: string
  title: string
  description: string
  type: "form" | "instruction" | "data collection"
  taskData: TaskData
  responseLimit: number | null
  responseLimitInterval: number | null
  availableFrom: string | null
  availableTo: string | null
  isDisabled: boolean
  pointOfInterestId: string
  createdAt: string
  updatedAt: string
}

interface Area {
  id: string
  name: string
  polygon: [number, number][]
}

interface POI {
  id: string
  name: string
  description: string
  radius: number
  areaId: string
  latitude: number
  longitude: number
  isDisabled: boolean
  createdAt: string
  updatedAt: string
  area: Area
  tasks: Task[]
}

export default function POIList() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = router.query
  const [POIInformation, setPOIInformation] = useState<POI | null>(null)
  const [Loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      const fetchPOI = async () => {
        try {
          const response = await axios.get(`/api/admin/pois/${id}`)
          console.log(response.data)
          setPOIInformation(response.data)
          setLoading(false)
        } catch (error) {
          console.error("Error fetching POI details:", error)
        }
      }
      fetchPOI()
    }
  }, [id])

  const handleCreateTask = () => {
    router.push(`/admin/pois/${id}/tasks/create`)
  }

  const createCustomIcon = (color: string, size: number) => {
    if (!L) return null

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

  if (Loading) {
    return (
      <DefaultLayout>
        <Breadcrumb
          pageName={t("Points of Interest")}
          breadcrumbPath={t("POIs")}
        />
        <GoBack data-cy='go-back-pois-details' />
        <div className='flex items-center justify-center h-screen'>
          <p className='text-gray-500 text-lg'>{t("Loading...")}</p>
        </div>
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={t("Points of Interest")}
        breadcrumbPath={t("POIs")}
      />
      <GoBack data-cy='go-back-pois-details' />
      <div className='flex'>
        <div className='flex-1 p-6 bg-white rounded-lg shadow-md dark:bg-gray-800'>
          <div className='mb-4 flex justify-between'>
            <button
              onClick={() => handleCreateTask()}
              className='px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
            >
              {t("Create task")}
            </button>
          </div>

          <h2 className='text-xl font-semibold  mb-4'>
            {POIInformation?.name}
          </h2>
          <h3 className='text-lg font-semibold  mb-4'>
            {t("Description")}:{" "}
            {POIInformation?.description || t("No description available")}
          </h3>

          <p>
            {t("Latitude")}: {POIInformation?.latitude}
          </p>
          <p className='mt-2'>
            {t("Longitude")}: {POIInformation?.longitude}
          </p>
          <p className='mt-2'>
            {t("Radius")}: {POIInformation?.radius}
          </p>
          <p className='mt-2'>
            {t("Created At")}: {POIInformation?.createdAt}
          </p>
          <p className='mt-2'>
            {t("Updated At")}: {POIInformation?.updatedAt}
          </p>

          <p className=' mt-2'>
            {t("Area")}: {POIInformation?.area.name}
          </p>

          <hr className='my-4' />
        </div>
        <div className='flex-1 p-6 bg-white rounded-lg shadow-md dark:bg-gray-800'>
          {POIInformation && (
            <MapContainer
              center={[POIInformation?.latitude, POIInformation?.longitude]}
              zoom={16}
              className='h-full rounded-md'
            >
              <TileLayer
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker
                position={[POIInformation?.latitude, POIInformation?.longitude]}
                icon={createCustomIcon("blue", 36)}
              />
              <Circle
                center={[POIInformation?.latitude, POIInformation?.longitude]}
                radius={POIInformation?.radius}
                pathOptions={{ color: "blue", fillOpacity: 0.2 }}
              />
            </MapContainer>
          )}
        </div>
      </div>
      <div className='flex-1 mt-4 p-6 bg-white rounded-lg shadow-md dark:bg-gray-800'>
        <h3 className='text-lg font-semibold  mb-4'>{t("Tasks")}</h3>
        <div className='flex flex-col gap-6'>
          {POIInformation?.tasks.length > 0 ? (
            POIInformation?.tasks.map((task: any) => (
              <div
                key={task.id}
                className='flex flex-col bg-white p-6 rounded-lg shadow-md dark:bg-gray-800'
              >
                <div className='mb-4'>
                  <h3 className='text-lg font-semibold text-gray-800 dark:text-white'>
                    {task.title}
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                    {task.description || t("No description provided")}
                  </p>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400'>
                  <div>
                    <span className='font-medium text-gray-800 dark:text-white'>
                      {t("Type")}:{" "}
                    </span>
                    {t(task.type)}
                  </div>
                  <div>
                    <span className='font-medium text-gray-800 dark:text-white'>
                      {t("Response Limit")}:{" "}
                    </span>
                    {task.responseLimit !== null
                      ? task.responseLimit
                      : t("Unlimited")}
                  </div>
                  <div>
                    <span className='font-medium text-gray-800 dark:text-white'>
                      {t("Response Interval")}:{" "}
                    </span>
                    {task.responseLimitInterval !== null
                      ? `${task.responseLimitInterval} ${t("minutes")}`
                      : t("Not defined")}
                  </div>
                  <div>
                    <span className='font-medium text-gray-800 dark:text-white'>
                      {t("Available From")}:{" "}
                    </span>
                    {task.availableFrom
                      ? new Date(task.availableFrom).toLocaleString()
                      : t("Not set")}
                  </div>
                  <div>
                    <span className='font-medium text-gray-800 dark:text-white'>
                      {t("Available To")}:{" "}
                    </span>
                    {task.availableTo
                      ? new Date(task.availableTo).toLocaleString()
                      : t("Not set")}
                  </div>
                  <div>
                    <span className='font-medium text-gray-800 dark:text-white'>
                      {t("Status")}:{" "}
                    </span>
                    {task.isDisabled ? t("Disabled") : t("Enabled")}
                  </div>
                  <div>
                    <span className='font-medium text-gray-800 dark:text-white'>
                      {t("Created At")}:{" "}
                    </span>
                    {new Date(task.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <span className='font-medium text-gray-800 dark:text-white'>
                      {t("Last Updated")}:{" "}
                    </span>
                    {new Date(task.updatedAt).toLocaleString()}
                  </div>
                </div>

                <div className='mt-4 flex justify-end'>
                  <button
                    onClick={() => router.push(`/admin/tasks/${task.id}/edit`)}
                    className='px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                  >
                    {t("Edit")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className='flex justify-center items-center bg-gray-50 p-6 rounded-lg shadow-md dark:bg-gray-800'>
              <p className='text-gray-500 dark:text-gray-400'>
                {t("No tasks available")}
              </p>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  )
}
