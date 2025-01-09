import { useRouter } from "next/router"
import { useEffect, useState, useMemo } from "react"
import axios from "axios"
import DefaultLayout from "../../../components/AdminLayout"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
import { MdArrowBack, MdEdit, MdCampaign } from "react-icons/md"
import dynamic from "next/dynamic"
import { useTranslation } from "@/hooks/useTranslation"
interface Campaign {
  id: string
  name: string
  description: string
  isOpen: boolean
  deadline: string | null
  type: string
  gameId: string | null
  areas: {
    id: string
    name: string
    description: string
    polygon: [number, number][] | null
    pointOfInterests: {
      id: string
      name: string
      latitude: number
      longitude: number
      disabled: boolean
      tasks: {
        id: string
      }[]
    }[]
  }[]
  allowedUsers: {
    accessType: string
    userId: string
  }[]
}

export default function CampaignDetails() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = router.query
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const Map = useMemo(
    () =>
      dynamic(() => import("../../../components/Common/Map"), {
        loading: () => <p>A map is loading</p>,
        ssr: false
      }),
    []
  )
  useEffect(() => {
    if (id) {
      const fetchCampaignDetails = async () => {
        try {
          const response = await axios.get(`/api/admin/campaigns/${id}`)
          setCampaign(response.data)
        } catch (error) {
          console.error("Error fetching campaign details:", error)
        }
      }

      fetchCampaignDetails()
    }
  }, [id])

  if (!campaign) {
    return (
      <DefaultLayout>
        <div className='flex items-center justify-center h-screen'>
          <p className='text-gray-500 text-lg'>Loading...</p>
        </div>
      </DefaultLayout>
    )
  }

  const accessTypeColors: Record<string, string> = {
    admin: "bg-red-200 text-red-800 dark:bg-red-800 dark:text-white",
    editor: "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-white",
    viewer: "bg-green-200 text-green-800 dark:bg-green-800 dark:text-white",
    contributor:
      "bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-white"
  }

  return (
    <DefaultLayout>
      <Breadcrumb
        icon={<MdCampaign />}
        pageName='Campaign Details'
        breadcrumbPath='Campaigns'
      />
      <div className='mx-auto p-6 bg-white rounded-lg shadow-md dark:bg-gray-800 max-full'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Columna izquierda */}
          <div>
            <div className='mb-4 flex justify-between'>
              <button
                onClick={() => router.back()}
                className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center space-x-2'
              >
                <MdArrowBack />
                <span>Back to Campaigns</span>
              </button>

              <button
                onClick={() =>
                  router.push(`/admin/campaigns/${campaign.id}/edit`)
                }
                className='px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 flex items-center space-x-2'
              >
                <MdEdit />
                <span>Edit Campaign</span>
              </button>
            </div>
            <h1 className='text-3xl font-bold text-gray-800 dark:text-white mb-4'>
              {campaign.name}
            </h1>
            <p className='text-gray-600 dark:text-gray-300 mb-6'>
              {campaign.description || "No description available."}
            </p>
            <div className='mb-6'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white mb-2'>
                Details
              </h2>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`px-2 py-1 text-sm font-medium rounded ${
                    campaign.isOpen
                      ? "bg-green-100 text-green-700 dark:bg-green-700 dark:text-white"
                      : "bg-red-100 text-red-700 dark:bg-red-700 dark:text-white"
                  }`}
                  data-cy='campaign-invitiation-status'
                >
                  {campaign.isOpen
                    ? "Open (Anyone can join)"
                    : "Closed (Invite only)"}
                </span>
              </p>
              <p>
                <strong>Deadline:</strong>{" "}
                {campaign.deadline
                  ? new Date(campaign.deadline).toLocaleDateString()
                  : "No Deadline"}
              </p>
            </div>
            <div className='mb-6'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white mb-2'>
                Users
              </h2>
              <ul>
                {campaign.allowedUsers.map(user => (
                  <li
                    key={user.userId}
                    className='text-gray-600 dark:text-gray-300 flex justify-between items-center'
                  >
                    <span>{user.userId}</span>
                    <span
                      className={`px-2 py-1 text-sm font-medium rounded ${
                        accessTypeColors[user.accessType] ||
                        "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {user.accessType}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Columna derecha */}
          <div className='h-full'>
            <h2 className='text-center text-xl font-semibold text-gray-800 dark:text-white mb-4'>
              Areas
            </h2>
            <div className='h-96 rounded-lg overflow-hidden shadow-lg'>
              <Map
                polygons={campaign?.areas}
                polygonsMultiColors={true}
                polygonsFitBounds={true}
                modeView='admin-view'
              />
            </div>
          </div>
        </div>
      </div>

      <div className='mx-auto p-6 mt-4 bg-white rounded-lg shadow-md dark:bg-gray-800'>
        <div className='mt-8'>
          <h2
            className='text-xl font-semibold text-gray-800 dark:text-white mb-4'
            data-cy='areas-title'
          >
            Areas
          </h2>
          <ul className='space-y-4'>
            {campaign?.areas?.map(sub => (
              <li
                key={sub.id}
                className='flex justify-between items-center p-4 bg-gray-100 rounded-lg shadow-md dark:bg-gray-700'
              >
                <div>
                  <h3 className='text-lg font-semibold text-gray-800 dark:text-white'>
                    {sub.name}
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    {sub.description || "No description available."}
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    {sub.polygon ? "Polygon" : "No Polygon"}
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    {sub.pointOfInterests.length} Points of Interest
                  </p>

                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    {sub.pointOfInterests.reduce(
                      (acc, poi) => acc + poi.tasks.length,
                      0
                    )}{" "}
                    Tasks
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/admin/areas/${sub.id}`)}
                  className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                >
                  View Area
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DefaultLayout>
  )
}
