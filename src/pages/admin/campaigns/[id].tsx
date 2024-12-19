import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import axios from "axios"
import DefaultLayout from "../../../components/AdminLayout"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"

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
    tasks: { id: string; name: string }[]
  }[]
  allowedUsers: {
    accessType: string
    userId: string
  }[]
}

export default function CampaignDetails() {
  const router = useRouter()
  const { id } = router.query
  const [campaign, setCampaign] = useState<Campaign | null>(null)

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
      <Breadcrumb pageName='Campaign Details' breadcrumbPath='Campaigns' />
      <div className='mx-auto p-6 bg-white rounded-lg shadow-md dark:bg-gray-800'>
        {/* <button
          onClick={() => router.back()}
          className='mb-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
        >
          ← Back to Campaigns
        </button> */}
        <div className='mb-4 flex justify-between'>
          <button
            onClick={() => router.back()}
            className='mb-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
          >
            ← Back to Campaigns
          </button>

          <button
            onClick={() => router.push(`/admin/campaigns/${campaign.id}/edit`)}
            className='px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
          >
            Edit Campaing
          </button>
        </div>
        <h1 className='text-3xl font-bold text-gray-800 dark:text-white mb-4'>
          {campaign.name}
        </h1>
        <p className='text-gray-600 dark:text-gray-300 mb-6'>
          {campaign.description || "No description available."}
        </p>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
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
            >
              {campaign.isOpen ? "Open" : "Closed"}
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
          <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
            Users
          </h2>
          <ul className='list-disc pl-5 space-y-2'>
            {campaign.allowedUsers.map(user => (
              <li
                key={user.userId}
                className='text-gray-600 dark:text-gray-300'
              >
                {user.userId} -{" "}
                {
                  <span
                    className={`px-2 py-1 text-sm font-medium rounded ${
                      accessTypeColors[user.accessType]
                    }`}
                  >
                    {user.accessType}
                  </span>
                }
              </li>
            ))}
          </ul>
        </div>
        <div className='mt-8'>
          <h2 className='text-xl font-semibold text-gray-800 dark:text-white mb-4'>
            Areas
          </h2>
          <ul className='space-y-4'>
            {campaign.areas.map(sub => (
              <li
                key={sub.id}
                className='flex justify-between items-center p-4 bg-gray-100 rounded-lg shadow-md dark:bg-gray-700'
              >
                <div>
                  <h3 className='text-lg font-semibold text-gray-800 dark:text-white'>
                    {sub.name}
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    {sub.tasks.length} Tasks
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
