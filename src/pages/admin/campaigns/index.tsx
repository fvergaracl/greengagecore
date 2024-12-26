import React, { useState, useEffect } from "react"
import axios from "axios"
import { useRouter } from "next/router"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons"
import Swal from "sweetalert2"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "../../../components/AdminLayout"
import { MdCampaign } from "react-icons/md"
interface Campaign {
  id: string
  name: string
  description: string
  isOpen: boolean
  deadline: string | null
  category: string
  gameId: string | null
  areas: {
    tasks: { id: string }[]
  }[]
  allowedUsers: {
    accessType: string
  }[]
}

export default function AdminCampaigns() {
  const router = useRouter()
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")

  const pageSize = 10

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get("/api/admin/campaigns")
        setAllCampaigns(response.data)
        setFilteredCampaigns(response.data)
      } catch (err) {
        console.error("Failed to fetch campaigns:", err)
      }
    }

    fetchCampaigns()
  }, [])

  useEffect(() => {
    const filtered = allCampaigns?.filter(
      campaign =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (campaign.description &&
          campaign.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase())) ||
        campaign.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredCampaigns(filtered)
    setCurrentPage(1)
  }, [searchQuery, allCampaigns])

  const handleView = (id: string) => {
    router.push(`/admin/campaigns/${id}`)
  }

  const handleEdit = (id: string) => {
    router.push(`/admin/campaigns/${id}/edit`)
  }

  const handleInviteOnly = (id: string) => {
    Swal.fire({
      title: "Invite-Only Campaign",
      text: "This campaign is invite-only. Share the link below:",
      input: "text",
      inputValue: `${process.env.NEXT_PUBLIC_BASE_URL}/campaigns/${id}/join`,
      inputAttributes: {
        disabled: "true"
      },
      showConfirmButton: true,
      confirmButtonText: "Close"
    })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handlePageChange = (direction: "prev" | "next") => {
    setCurrentPage(prev =>
      direction === "prev"
        ? Math.max(prev - 1, 1)
        : Math.min(prev + 1, Math.ceil(filteredCampaigns.length / pageSize))
    )
  }

  const accessTypeColors: Record<string, string> = {
    admin: "bg-red-200 text-red-800 dark:bg-red-800 dark:text-white",
    editor: "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-white",
    viewer: "bg-green-200 text-green-800 dark:bg-green-800 dark:text-white",
    contributor:
      "bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-white"
  }

  const startIndex = (currentPage - 1) * pageSize
  const paginatedCampaigns = filteredCampaigns?.slice(
    startIndex,
    startIndex + pageSize
  )

  const isPastDeadline = (deadline: string | null) => {
    return deadline ? new Date(deadline) < new Date() : false
  }

  const groupParticipants = (allowedUsers: Campaign["allowedUsers"]) => {
    return allowedUsers.reduce((acc: Record<string, number>, user) => {
      acc[user.accessType] = (acc[user.accessType] || 0) + 1
      return acc
    }, {})
  }
  // ='Campaigns'
  return (
    <DefaultLayout>
      <Breadcrumb
        icon={<MdCampaign />}
        pageName='Campaigns'
        breadcrumbPath='Campaigns'
      />

      <div className='overflow-x-auto rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark'>
        <div className='mb-4'>
          <input
            type='text'
            placeholder='Search by name, description, or type'
            value={searchQuery}
            onChange={handleSearchChange}
            className='w-full p-2 border border-gray-300 rounded-md focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
          />
        </div>

        <table className='min-w-full table-auto border-collapse'>
          <thead>
            <tr className='bg-gray-100 text-left text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300'>
              <th className='border px-4 py-2'>#</th>
              <th className='border px-4 py-2'>Name</th>
              <th className='border px-4 py-2'>Description</th>
              <th className='border px-4 py-2'>Status</th>
              <th className='border px-4 py-2'>Deadline</th>
              <th className='border px-4 py-2'>Type</th>
              <th className='border px-4 py-2'>Areas</th>
              <th className='border px-4 py-2'>POIs</th>
              <th className='border px-4 py-2'>Users</th>
              <th className='border px-4 py-2'>Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedCampaigns?.map((campaign, index) => {
              const groupedUsers = groupParticipants(campaign.allowedUsers)
              // Areas and Task counts
              const areaCount = campaign.areas.length
              const pointOfInterestsCount =
                campaign?.areas?.pointOfInterests?.length || 0
              return (
                <tr
                  key={campaign.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    isPastDeadline(campaign.deadline) && "opacity-50"
                  }`}
                >
                  <td className='border px-4 py-2'>{startIndex + index + 1}</td>
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
                      <span
                        className='inline-block rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-700 dark:text-white cursor-pointer'
                        onClick={() => handleInviteOnly(campaign.id)}
                      >
                        Invite-only
                      </span>
                    )}
                  </td>
                  <td className='border px-4 py-2 text-sm'>
                    {campaign.deadline
                      ? new Date(campaign.deadline).toLocaleDateString()
                      : "No Deadline"}
                  </td>
                  <td className='border px-4 py-2'>{campaign.category}</td>
                  <td className='border px-4 py-2 text-center'>{areaCount}</td>
                  <td className='border px-4 py-2 text-center'>
                    {pointOfInterestsCount}
                  </td>
                  <td className='border px-4 py-2 text-center'>
                    {Object.entries(groupedUsers).map(([accessType, count]) => (
                      <span
                        key={accessType}
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          accessTypeColors[accessType] ||
                          "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {accessType}: {count}
                      </span>
                    )) || "-"}
                  </td>
                  <td className='border px-4 py-2'>
                    <div className='flex gap-2'>
                      <button
                        title='View'
                        onClick={() => handleView(campaign.id)}
                        className='rounded bg-blue-100 p-2 text-blue-600 hover:bg-blue-200'
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        title='Edit'
                        onClick={() => handleEdit(campaign.id)}
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

        <div className='flex justify-between mt-4'>
          <button
            onClick={() => handlePageChange("prev")}
            disabled={currentPage === 1}
            className='px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50'
          >
            Previous
          </button>
          <span>
            Page {currentPage} of{" "}
            {filteredCampaigns?.length > 0
              ? Math.ceil(filteredCampaigns?.length / pageSize)
              : "1"}
          </span>
          <button
            onClick={() => handlePageChange("next")}
            disabled={
              currentPage === Math.ceil(filteredCampaigns?.length / pageSize)
            }
            className='px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50'
          >
            Next
          </button>
        </div>
      </div>
    </DefaultLayout>
  )
}
