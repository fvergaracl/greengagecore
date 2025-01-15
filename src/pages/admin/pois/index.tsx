import React, { useState, useEffect } from "react"
import axios from "axios"
import { useRouter } from "next/router"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons"
import { MdOutlinePinDrop } from "react-icons/md"
import ColumnSelector from "@/components/Admin/ColumnSelector"
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "@/components/AdminLayout"
import { useTranslation } from "@/hooks/useTranslation"
interface PointOfInterest {
  id: string
  name: string
  description: string | null
  isDisabled: boolean
  area: { id: string; name: string }
  createdAt: string
  updatedAt: string
}

interface VisibleColumns {
  id: boolean
  name: boolean
  description: boolean
  radius: boolean
  campaign: boolean
  area: boolean
  tasks: boolean
  latitude: boolean
  longitude: boolean
  details: boolean
  actions: boolean
  createdAt: boolean
  updatedAt: boolean
}

interface Campaign {
  id: string
  name: string
}

export default function AdminPOIs() {
  const { t } = useTranslation()
  const router = useRouter()
  const [pois, setPois] = useState<PointOfInterest[]>([])
  const [filteredPOIs, setFilteredPOIs] = useState<PointOfInterest[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    id: true,
    name: true,
    description: true,
    radius: true,
    campaign: true,
    area: true,
    tasks: true,
    latitude: true,
    longitude: true,
    details: true,
    actions: true,
    createdAt: true,
    updatedAt: true
  })

  const pageSize = 10

  useEffect(() => {
    const fetchPOIs = async () => {
      try {
        const response = await axios.get("/api/admin/pois")
        console.log("-----------response.data ")
        console.log("-----------response.data1 ")
        console.log("-----------response.data ")
        console.log(response.data)
        setPois(response.data)
        setFilteredPOIs(response.data)
      } catch (err) {
        console.error("Failed to fetch POIs:", err)
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

    fetchPOIs()
    fetchCampaigns()
  }, [])

  useEffect(() => {
    const filtered = pois.filter(poi => {
      const matchesSearch =
        poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (poi.description &&
          poi.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCampaign = selectedCampaign
        ? poi.area.id === selectedCampaign
        : true

      return matchesSearch && matchesCampaign
    })

    setFilteredPOIs(filtered)
    setCurrentPage(1)
  }, [searchQuery, selectedCampaign, pois])

  const handleColumnToggle = (column: string) => {
    const newCampaingColumns = {
      ...visibleColumns,
      [column]: !visibleColumns[column]
    }

    setVisibleColumns(prev => newCampaingColumns)
  }

  const handleView = (id: string) => {
    router.push(`/admin/pois/${id}`)
  }

  const handleEdit = (id: string) => {
    router.push(`/admin/pois/${id}/edit`)
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
        : Math.min(prev + 1, Math.ceil(filteredPOIs.length / pageSize))
    )
  }

  const startIndex = (currentPage - 1) * pageSize
  const paginatedPOIs = filteredPOIs.slice(startIndex, startIndex + pageSize)

  return (
    <DefaultLayout>
      <Breadcrumb
        icon={<MdOutlinePinDrop />}
        pageName={t("Points of Interest")}
        breadcrumbPath={t("POIs")}
      />
      <div className='flex justify-end gap-4 mb-4'>
        <ColumnSelector
          visibleColumns={visibleColumns}
          onToggleColumn={handleColumnToggle}
        />
      </div>
      <div className='overflow-x-auto rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark'>
        <div className='flex items-center gap-4 mb-4'>
          <input
            type='text'
            placeholder={t("Search by name or description")}
            value={searchQuery}
            onChange={handleSearchChange}
            className='w-full p-2 border border-gray-300 rounded-md focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
          />

          <select
            value={selectedCampaign}
            onChange={handleCampaignFilterChange}
            className='p-2 border border-gray-300 rounded-md focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
          >
            <option value=''>All Campaigns</option>
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        <table className='min-w-full table-auto border-collapse'>
          <thead>
            <tr className='bg-gray-100 text-left text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300'>
              {visibleColumns.id && <th className='border px-4 py-2'>#</th>}
              {visibleColumns.name && (
                <th className='border px-4 py-2'>{t("Name")}</th>
              )}
              {visibleColumns.description && (
                <th className='border px-4 py-2'>{t("Description")}</th>
              )}
              {visibleColumns.campaign && (
                <th className='border px-4 py-2'>{t("Parent Campaign")}</th>
              )}
              {visibleColumns.area && (
                <th className='border px-4 py-2'>{t("Parent Area")}</th>
              )}
              {visibleColumns.tasks && (
                <th className='border px-4 py-2'>{t("Tasks")}</th>
              )}
              {visibleColumns.details && (
                <th className='border px-4 py-2'>{t("Details")}</th>
              )}
              {<th className='border px-4 py-2'>{t("Actions")}</th>}
              {visibleColumns.createdAt && (
                <th className='border px-4 py-2'>{t("Created At")}</th>
              )}
              {visibleColumns.updatedAt && (
                <th className='border px-4 py-2'>{t("Updated At")}</th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedPOIs.map((poi, index) => (
              <tr
                key={poi.id}
                className='hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                {visibleColumns.id && (
                  <td className='border px-4 py-2' title={poi.id}>
                    {startIndex + index + 1}
                  </td>
                )}
                <td className='border px-4 py-2 font-medium text-gray-800 dark:text-white'>
                  {poi.name}
                </td>
                <td className='border px-4 py-2 text-sm text-gray-600 dark:text-gray-400'>
                  {poi.description || "-"}
                </td>
                <td className='border px-4 py-2'>{poi.area.campaign.name}</td>
                <td className='border px-4 py-2'>{poi.area.name}</td>
                <td className='border px-4 py-2'>
                  {poi.tasks.length > 0 ? (
                    <span
                      className='text-green-600'
                      data-cy={`poi-${poi.id}-tasks`}
                    >
                      {poi.tasks.length}
                    </span>
                  ) : (
                    <span
                      className='text-red-600'
                      data-cy={`poi-${poi.id}-tasks`}
                    >
                      No
                    </span>
                  )}
                </td>
                <td className='border px-4 py-2'>
                  <div className='flex gap-2'>
                    <button
                      title='View'
                      onClick={() => handleView(poi.id)}
                      className='rounded bg-blue-100 p-2 text-blue-600 hover:bg-blue-200'
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    <button
                      title='Edit'
                      onClick={() => handleEdit(poi.id)}
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
            {filteredPOIs.length > 0
              ? Math.ceil(filteredPOIs.length / pageSize)
              : "1"}
          </span>
          <button
            onClick={() => handlePageChange("next")}
            disabled={currentPage === Math.ceil(filteredPOIs.length / pageSize)}
            className='px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50'
          >
            Next
          </button>
        </div>
      </div>
    </DefaultLayout>
  )
}
