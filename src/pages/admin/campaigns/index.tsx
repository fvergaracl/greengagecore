import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { useRouter } from "next/router"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons"
import Swal from "sweetalert2"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "../../../components/AdminLayout"
import { MdCampaign } from "react-icons/md"
import { useAdmin } from "@/context/AdminContext"
import { FaDrawPolygon, FaTasks, FaUsers } from "react-icons/fa"
import { MdOutlinePinDrop } from "react-icons/md"
import ColumnSelector from "@/components/Admin/ColumnSelector"
interface Campaign {
  id: string
  name: string
  description: string
  isOpen: boolean
  startDatetime: string | null
  endDatetime: string | null
  location: string | null
  category: string
  gameId: string | null
  areas: {
    tasks: { id: string }[]
  }[]
  allowedUsers: {
    accessType: string
  }[]
  created_at: string
  updated_at: string
}

interface VisibleColumns {
  id: boolean
  name: boolean
  description: boolean
  location: boolean
  status: boolean
  dates: boolean
  category: boolean
  details: boolean
  actions: boolean
  created_at: boolean
  updated_at: boolean
  gamificated: boolean
}

export default function AdminCampaigns() {
  const { user } = useAdmin()
  const router = useRouter()
  const { campaignId } = router.query
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState(campaignId || "")
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    id: true,
    name: true,
    description: true,
    location: false,
    status: true,
    dates: true,
    category: true,
    details: true,
    actions: true,
    created_at: false,
    updated_at: false,
    gamificated: false
  })

  const pageSize = 10

  useEffect(() => {
    if (campaignId && typeof campaignId === "string") {
      setSearchQuery(campaignId)
    }
  }, [campaignId])

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get("/api/admin/campaigns")
        setAllCampaigns(response.data)
        setFilteredCampaigns(response.data)
        console.log({ response: response.data })
      } catch (err) {
        console.error("Failed to fetch campaigns:", err)
      }
    }

    fetchCampaigns()
  }, [])

  useEffect(() => {
    if (!allCampaigns || !searchQuery) {
      setFilteredCampaigns(allCampaigns) // Si no hay búsqueda, muestra todas las campañas
      return
    }

    const lowercasedQuery = searchQuery.toLowerCase()

    const filtered = allCampaigns.filter(campaign => {
      const { name, description, location, category, id } = campaign

      return (
        name.toLowerCase().includes(lowercasedQuery) ||
        (description && description.toLowerCase().includes(lowercasedQuery)) ||
        (location && location.toLowerCase().includes(lowercasedQuery)) ||
        category.toLowerCase().includes(lowercasedQuery) ||
        id.toLowerCase().includes(lowercasedQuery)
      )
    })

    setFilteredCampaigns(filtered)
    setCurrentPage(1)
  }, [searchQuery, allCampaigns])

  const handleColumnToggle = (column: string) => {
    const newCampaingColumns = {
      ...visibleColumns,
      [column]: !visibleColumns[column]
    }
    
    setVisibleColumns(prev => newCampaingColumns)
  }

  const handleView = useCallback(
    (id: string) => {
      router.push(`/admin/campaigns/${id}`)
    },
    [router]
  )

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/admin/campaigns/${id}/edit`)
    },
    [router]
  )

  const handleInviteOnly = useCallback(
    (id: string) => {
      const campaignLink = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/campaigns?invite=${id}&fromuser=${user?.sub}`

      Swal.fire({
        title: "Invite-Only Campaign",
        html: `
        <p>This campaign is invite-only. Share the link below:</p>
        <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
          <input 
            type="text" 
            value="${campaignLink}" 
            style="width: 100%; padding: 8px; font-size: 14px;" 
            readonly
          />
          <button 
            id="copy-to-clipboard" 
            style="display: flex; align-items: center; padding: 8px; background-color: #f1f1f1; border: none; cursor: pointer;"
            title="Copy to clipboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16v4a2 2 0 002 2h8a2 2 0 002-2v-4M16 12v4m-4-4v4m4-4v4m-8 0h.01M4 4h8a2 2 0 012 2v2M4 6v2m16-2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2h4m4-2v2m-4-2v2" /></svg>
          </button>
        </div>
      `,
        showConfirmButton: true,
        confirmButtonText: "Close",
        didOpen: () => {
          const copyButton = document.getElementById("copy-to-clipboard")
          if (copyButton) {
            copyButton.addEventListener("click", () => {
              navigator.clipboard.writeText(campaignLink)
              Swal.fire({
                icon: "success",
                title: "Copied!",
                text: "The link has been copied to your clipboard.",
                timer: 1500,
                showConfirmButton: false
              })
            })
          }
        }
      })
    },
    [user]
  )

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
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredCampaigns.slice(startIndex, startIndex + pageSize)
  }, [currentPage, filteredCampaigns])

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
      <div className='flex justify-end gap-4 mb-4'>
        <ColumnSelector
          visibleColumns={visibleColumns}
          onToggleColumn={handleColumnToggle}
        />
      </div>

      <div className='overflow-x-auto rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark'>
        <div className='mb-4'>
          <input
            type='text'
            placeholder='Search by name, description, location, category, or ID'
            value={searchQuery}
            onChange={handleSearchChange}
            className='w-full p-2 border border-gray-300 rounded-md focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
          />
        </div>

        <table className='min-w-full table-auto border-collapse'>
          <thead>
            <tr className='bg-gray-100 text-left text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300'>
              {visibleColumns.id && <th className='border px-2 py-2'>#</th>}
              {visibleColumns.name && (
                <th className='border px-2 py-2'>Name</th>
              )}
              {visibleColumns.description && (
                <th className='border px-2 py-2'>Description</th>
              )}
              {visibleColumns.location && (
                <th className='border px-2 py-2'>Location</th>
              )}
              {visibleColumns.status && (
                <th className='border px-2 py-2'>Status</th>
              )}
              {visibleColumns.dates && (
                <th className='border px-2 py-2'>Start Date / Deadline</th>
              )}
              {visibleColumns.category && (
                <th className='border px-2 py-2'>Category</th>
              )}
              {visibleColumns.category && (
                <th className='border px-2 py-2 text-center'>
                  <div className='flex flex-col items-center gap-2'>
                    {/* Areas */}
                    <div
                      className='flex items-center gap-1'
                      title='Number of areas'
                    >
                      <FaDrawPolygon className='inline-block text-blue-500' />
                      <span className='text-sm font-medium '>Areas</span>
                    </div>
                    {/* POIs */}
                    <div
                      className='flex items-center gap-1'
                      title='Number of points of interest'
                    >
                      <MdOutlinePinDrop className='inline-block text-green-500' />
                      <span className='text-sm font-medium '>POIs</span>
                    </div>
                    {/* Tasks */}
                    <div
                      className='flex items-center gap-1'
                      title='Number of tasks'
                    >
                      <FaTasks className='inline-block text-yellow-500' />
                      <span className='text-sm font-medium'>Tasks</span>
                    </div>
                    {/* Users */}
                    <div
                      className='flex items-center gap-1'
                      title='Number of users'
                    >
                      <FaUsers className='inline-block text-purple-500' />
                      <span className='text-sm font-medium'>Users</span>
                    </div>
                  </div>
                </th>
              )}
              {visibleColumns.created_at && (
                <th className='border px-2 py-2'>Created At</th>
              )}
              {visibleColumns.updated_at && (
                <th className='border px-2 py-2'>Updated At</th>
              )}
              {visibleColumns.gamificated && (
                <th className='border px-2 py-2'>Gamified</th>
              )}
              {visibleColumns.actions && (
                <th className='border px-2 py-2 text-center'>Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedCampaigns?.map((campaign, index) => {
              const groupedUsers = groupParticipants(campaign.allowedUsers)
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
                  {visibleColumns.id && (
                    <td className='border px-2 py-2' title={campaign.id}>
                      {startIndex + index + 1}
                    </td>
                  )}
                  {visibleColumns.name && (
                    <td className='border px-2 py-2 font-medium text-gray-800 dark:text-white'>
                      {campaign.name}
                    </td>
                  )}
                  {visibleColumns.description && (
                    <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                      {campaign.description || "-"}
                    </td>
                  )}
                  {visibleColumns.location && (
                    <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                      {campaign.location || "-"}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className='border px-2 py-2'>
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
                  )}
                  {visibleColumns.dates && (
                    <td className='border px-2 py-2 text-sm'>
                      {
                        <>
                          {campaign.startDatetime && (
                            <span>
                              Start:{" "}
                              {new Date(
                                campaign.startDatetime
                              ).toLocaleString()}
                            </span>
                          )}
                          {campaign.endDatetime && (
                            <span>
                              <br />
                              Deadline:{" "}
                              {new Date(campaign.endDatetime).toLocaleString()}
                            </span>
                          )}
                        </>
                      }
                    </td>
                  )}
                  {visibleColumns.category && (
                    <td className='border px-2 py-2'>{campaign.category}</td>
                  )}
                  {visibleColumns.details && (
                    <td className='border px-2 py-2 text-center'>
                      <div className='flex items-center justify-center gap-2'>
                        {/* Areas */}
                        <button
                          onClick={() =>
                            console.log("Clicked on Areas", areaCount)
                          }
                          className='rounded px-2 py-1 text-xs font-semibold bg-blue-200 text-blue-800 flex items-center gap-1 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400'
                          title='Click to view areas in the campaign'
                        >
                          <FaDrawPolygon className='inline-block' />
                          {areaCount}
                        </button>

                        {/* Points of Interest */}
                        <button
                          onClick={() =>
                            console.log(
                              "Clicked on POIs",
                              pointOfInterestsCount
                            )
                          }
                          className='rounded px-2 py-1 text-xs font-semibold bg-green-200 text-green-800 flex items-center gap-1 hover:bg-green-300 focus:outline-none focus:ring-2 focus:ring-green-400'
                          title='Click to view points of interest in the campaign'
                        >
                          <MdOutlinePinDrop className='inline-block' />
                          {pointOfInterestsCount}
                        </button>

                        {/* Tasks */}
                        <button
                          onClick={() =>
                            console.log(
                              "Clicked on Tasks",
                              campaign.areas.reduce(
                                (acc, area) => acc + area.tasks.length,
                                0
                              )
                            )
                          }
                          className='rounded px-2 py-1 text-xs font-semibold bg-yellow-200 text-yellow-800 flex items-center gap-1 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400'
                          title='Click to view tasks in the campaign'
                        >
                          <FaTasks className='inline-block' />
                          {campaign.areas.reduce(
                            (acc, area) => acc + area.tasks.length,
                            0
                          )}
                        </button>

                        {/* Users */}
                        <button
                          onClick={() =>
                            console.log(
                              "Clicked on Users",
                              Object.keys(groupedUsers)
                            )
                          }
                          className='rounded px-2 py-1 text-xs font-semibold bg-purple-200 text-purple-800 flex items-center gap-1 hover:bg-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400'
                          title='Click to view users with access to the campaign'
                        >
                          <FaUsers className='inline-block' />
                          {Object.keys(groupedUsers).length || 0}
                        </button>
                      </div>
                    </td>
                  )}
                  {visibleColumns.created_at && (
                    <td className='border px-2 py-2'>
                      {new Date(campaign.created_at).toLocaleString()}
                    </td>
                  )}
                  {visibleColumns.updated_at && (
                    <td className='border px-2 py-2'>
                      {new Date(campaign.updated_at).toLocaleString()}
                    </td>
                  )}
                  {visibleColumns.gamificated && (
                    <td className='border px-2 py-2'>
                      {campaign.gameId ? (
                        <span className='inline-block rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-700 dark:text-white'>
                          Yes
                        </span>
                      ) : (
                        <span className='inline-block rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-700 dark:text-white'>
                          No
                        </span>
                      )}
                    </td>
                  )}
                  {visibleColumns.actions && (
                    <td className='border px-2 py-2'>
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
                  )}
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
