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
  subCampaigns: {
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

  return (
    <DefaultLayout>
      <Breadcrumb pageName='Campaign Details' breadcrumbPath='Campaigns' />
      <div className=' mx-auto p-6 bg-white rounded-lg shadow-md dark:bg-gray-800'>
        <button
          onClick={() => router.back()}
          className='mb-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
        >
          ← Back to Campaigns
        </button>
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
            Subcampaigns
          </h2>
          <ul className='list-disc pl-5 space-y-2'>
            {campaign.subCampaigns.map(sub => (
              <li key={sub.id} className='text-gray-600 dark:text-gray-300'>
                <strong>{sub.name}</strong> ({sub.tasks.length} tasks)
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
            Participants
          </h2>
          <ul className='list-disc pl-5 space-y-2'>
            {campaign.allowedUsers.map(user => (
              <li
                key={user.userId}
                className='text-gray-600 dark:text-gray-300'
              >
                {user.userId} ({user.accessType})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DefaultLayout>
  )
}
