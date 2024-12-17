import React, { useState, useEffect } from "react"
import axios from "axios"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons"
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "../../components/AdminLayout"

interface Campaign {
  id: string
  name: string
  description: string
  isOpen: boolean
  deadline: string | null
  type: string
  gameId: string | null
  subCampaigns: {
    tasks: { id: string }[]
  }[]
  allowedUsers: {
    accessType: string
  }[]
}

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    const fetchCampaigns = async () => {
      const response = await axios.get("/api/admin/campaigns")
      setCampaigns(response.data)
    }

    fetchCampaigns()
  }, [])

  const groupParticipants = (allowedUsers: Campaign["allowedUsers"]) => {
    return allowedUsers.reduce((acc: Record<string, number>, user) => {
      acc[user.accessType] = (acc[user.accessType] || 0) + 1
      return acc
    }, {})
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
      <Breadcrumb pageName='Campaigns' breadcrumbPath='Campaigns' />

      <div className='overflow-x-auto rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark'>
        <h2 className='mb-4 text-xl font-bold text-gray-800 dark:text-white'>
          Campaigns List
        </h2>
        <table className='min-w-full table-auto border-collapse'>
          {/* Table Header */}
          <thead>
            <tr className='bg-gray-100 text-left text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300'>
              <th className='border px-4 py-2'>#</th>
              <th className='border px-4 py-2'>Name</th>
              <th className='border px-4 py-2'>Description</th>
              <th className='border px-4 py-2'>Status</th>
              <th className='border px-4 py-2'>Deadline</th>
              <th className='border px-4 py-2'>Subcampaigns</th>
              <th className='border px-4 py-2'>Tasks</th>
              <th className='border px-4 py-2'>Participants</th>
              <th className='border px-4 py-2'>Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {campaigns.map((campaign, index) => {
              const groupedUsers = groupParticipants(campaign.allowedUsers)

              // Subcampaign and Task counts
              const subCampaignCount = campaign.subCampaigns.length
              const totalTaskCount = campaign.subCampaigns.reduce(
                (total, subCampaign) => total + subCampaign.tasks.length,
                0
              )

              return (
                <tr
                  key={campaign.id}
                  className='hover:bg-gray-50 dark:hover:bg-gray-700'
                >
                  <td className='border px-4 py-2'>{index + 1}</td>
                  <td className='border px-4 py-2 font-medium text-gray-800 dark:text-white'>
                    {campaign.name}
                  </td>
                  <td className='border px-4 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {campaign.description || "-"}
                  </td>
                  <td className='border px-4 py-2'>
                    {campaign.isOpen ? (
                      <span className='inline-block rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-700 dark:text-white'>
                        Open
                      </span>
                    ) : (
                      <span className='inline-block rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-700 dark:text-white'>
                        Closed
                      </span>
                    )}
                  </td>
                  <td className='border px-4 py-2 text-sm'>
                    {campaign.deadline
                      ? new Date(campaign.deadline).toLocaleDateString()
                      : "No Deadline"}
                  </td>
                  <td className='border px-4 py-2 text-center'>
                    {subCampaignCount}
                  </td>
                  <td className='border px-4 py-2 text-center'>
                    {totalTaskCount}
                  </td>
                  {/* Grouped Participants */}
                  <td className='border px-4 py-2'>
                    <div className='flex flex-wrap gap-2'>
                      {Object.entries(groupedUsers).map(
                        ([accessType, count]) => (
                          <span
                            key={accessType}
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              accessTypeColors[accessType] ||
                              "bg-gray-200 text-gray-800"
                            }`}
                          >
                            {accessType}: {count}
                          </span>
                        )
                      )}
                    </div>
                  </td>
                  {/* Actions */}
                  <td className='border px-4 py-2'>
                    <div className='flex gap-2'>
                      <button
                        title='View'
                        className='rounded bg-blue-100 p-2 text-blue-600 hover:bg-blue-200'
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        title='Edit'
                        className='rounded bg-yellow-100 p-2 text-yellow-600 hover:bg-yellow-200'
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        title='Delete'
                        className='rounded bg-red-100 p-2 text-red-600 hover:bg-red-200'
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </DefaultLayout>
  )
}
