import React, { useState, useEffect } from "react"
import axios from "axios"
import { useRouter } from "next/router"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "../../../components/AdminLayout"

interface Area {
  id: string
  name: string
  description: string
  campaign: { id: string; name: string } // Parent Campaign
  disabled: boolean
  tasks: { id: string }[]
  created_at: string
  updated_at: string
}

interface Campaign {
  id: string
  name: string
}

export default function AdminAreas() {
  const router = useRouter()
  const [allAreas, setAllAreas] = useState<Area[]>([])
  const [filteredAreas, setFilteredAreas] = useState<Area[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([]) // List of parent campaigns
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCampaign, setSelectedCampaign] = useState("") // Selected parent campaign for filtering

  const pageSize = 10

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await axios.get("/api/admin/areas")
        setAllAreas(response.data)
        setFilteredAreas(response.data)
      } catch (err) {
        console.error("Failed to fetch areas:", err)
      }
    }

    const fetchCampaigns = async () => {
      try {
        const response = await axios.get("/api/admin/campaigns/names")
        setCampaigns(response.data)
      } catch (err) {
        console.error("Failed to fetch campaigns:", err)
      }
    }

    fetchAreas()
    fetchCampaigns()
  }, [])

  useEffect(() => {
    const filtered = allAreas.filter(area => {
      const matchesSearch =
        area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (area.description &&
          area.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCampaign = selectedCampaign
        ? area.campaign.id === selectedCampaign
        : true

      return matchesSearch && matchesCampaign
    })

    setFilteredAreas(filtered)
    setCurrentPage(1)
  }, [searchQuery, selectedCampaign, allAreas])

  const handleView = (id: string) => {
    router.push(`/admin/areas/${id}`)
  }

  const handleEdit = (id: string) => {
    router.push(`/admin/areas/${id}/edit`)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleCampaignFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedCampaign(e.target.value)
  }

  const handlePageChange = (direction: "prev" | "next") => {
    setCurrentPage(prev =>
      direction === "prev"
        ? Math.max(prev - 1, 1)
        : Math.min(prev + 1, Math.ceil(filteredAreas.length / pageSize))
    )
  }

  const startIndex = (currentPage - 1) * pageSize
  const paginatedAreas = filteredAreas.slice(startIndex, startIndex + pageSize)

  return (
    <DefaultLayout>
      <Breadcrumb pageName='Areas' breadcrumbPath='Areas' />

      <div className='overflow-x-auto rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark'>
        <div className='flex items-center gap-4 mb-4'>
          {/* Search Bar */}
          <input
            type='text'
            placeholder='Search by name or description'
            value={searchQuery}
            onChange={handleSearchChange}
            className='w-full p-2 border border-gray-300 rounded-md focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
          />

          {/* Campaign Filter */}
          <select
            value={selectedCampaign}
            onChange={handleCampaignFilterChange}
            className='p-2 border border-gray-300 rounded-md focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
          >
            <option value=''>All Campaigns</option>
            {campaigns?.map(campaign => (
              <option key={campaign?.id} value={campaign?.id}>
                {campaign?.name}
              </option>
            ))}
          </select>
        </div>

        <table className='min-w-full table-auto border-collapse'>
          <thead>
            <tr className='bg-gray-100 text-left text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300'>
              <th className='border px-4 py-2'>#</th>
              <th className='border px-4 py-2'>Name</th>
              <th className='border px-4 py-2'>Description</th>
              <th className='border px-4 py-2'>Parent Campaign</th>
              <th className='border px-4 py-2'>Tasks</th>
              <th className='border px-4 py-2'>Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedAreas.map((area, index) => (
              <tr
                key={area.id}
                className='hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                <td className='border px-4 py-2'>{startIndex + index + 1}</td>
                <td className='border px-4 py-2 font-medium text-gray-800 dark:text-white'>
                  {area.name}
                </td>
                <td className='border px-4 py-2 text-sm text-gray-600 dark:text-gray-400'>
                  {area.description || "-"}
                </td>
                <td className='border px-4 py-2'>{area.campaign.name}</td>
                <td className='border px-4 py-2 text-center'>
                  {area?.tasks?.length}
                </td>
                <td className='border px-4 py-2'>
                  <div className='flex gap-2'>
                    <button
                      title='View'
                      onClick={() => handleView(area.id)}
                      className='rounded bg-blue-100 p-2 text-blue-600 hover:bg-blue-200'
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    <button
                      title='Edit'
                      onClick={() => handleEdit(area.id)}
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
            ))}
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
            {filteredAreas.length > 0
              ? Math.ceil(filteredAreas.length / pageSize)
              : "1"}
          </span>
          <button
            onClick={() => handlePageChange("next")}
            disabled={
              currentPage === Math.ceil(filteredAreas.length / pageSize)
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
