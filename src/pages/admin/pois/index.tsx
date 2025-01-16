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
import Swal from "sweetalert2"
interface PointOfInterest {
  id: string
  name: string
  description: string | null
  isDisabled: boolean
  area: {
    id: string
    name: string
    campaign: {
      id: string
      name: string
    }
  }
  tasks: { id: string; name: string }[]
  latitude: number
  longitude: number
  radius: number
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
    createdAt: false,
    updatedAt: false
  })

  const pageSize = 10

  useEffect(() => {
    const fetchPOIs = async () => {
      try {
        const response = await axios.get("/api/admin/pois")
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

    setVisibleColumns(() => newCampaingColumns)
  }

  const handleView = (id: string) => {
    router.push(`/admin/pois/${id}`)
  }

  const handleEdit = (id: string) => {
    router.push(`/admin/pois/${id}/edit`)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await Swal.fire({
      title: t("Are you sure?"),
      text: t("This action cannot be undone"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Yes, delete it"),
      cancelButtonText: t("No, keep it")
    })

    if (!confirmed.isConfirmed) {
      return
    }

    try {
      await axios.delete(`/api/admin/pois/${id}`)
      const updatedPOIs = pois.filter(poi => poi.id !== id)
      setPois(updatedPOIs)
      setFilteredPOIs(updatedPOIs)
      Swal.fire({
        title: t("Deleted"),
        text: t("The POI has been deleted"),
        icon: "success"
      })
    } catch (err) {
      console.error("Failed to delete POI:", err)
      Swal.fire({
        title: t("Error"),
        text: t("Failed to delete the POI"),
        icon: "error"
      })
    }
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
              {visibleColumns.createdAt && (
                <th className='border px-4 py-2'>{t("Created At")}</th>
              )}
              {visibleColumns.updatedAt && (
                <th className='border px-4 py-2'>{t("Updated At")}</th>
              )}
              {visibleColumns.details && (
                <th className='border px-4 py-2'>{t("Details")}</th>
              )}
              {visibleColumns.actions && (
                <th className='border px-4 py-2'>{t("Actions")}</th>
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
                {visibleColumns.name && (
                  <td className='border px-4 py-2 font-medium text-gray-800 dark:text-white'>
                    {poi.name}
                  </td>
                )}
                {visibleColumns.description && (
                  <td className='border px-4 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {poi.description || "-"}
                  </td>
                )}
                {visibleColumns.campaign && (
                  <td className='border px-4 py-2'>{poi.area.campaign.name}</td>
                )}

                {visibleColumns.area && (
                  <td className='border px-4 py-2'>{poi.area.name}</td>
                )}
                {visibleColumns.tasks && (
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
                        {t("No")}
                      </span>
                    )}
                  </td>
                )}
                {visibleColumns.details && (
                  <td className='border px-4 py-2'>
                    <div>
                      <span className='font-semibold'>{t("Latitude")}:</span>{" "}
                      {poi.latitude}
                    </div>
                    <div>
                      <span className='font-semibold'>{t("Longitude")}:</span>{" "}
                      {poi.longitude}
                    </div>
                    <div>
                      <span className='font-semibold'>{t("Radius")}:</span>{" "}
                      {poi.radius}
                    </div>
                  </td>
                )}
                {visibleColumns.createdAt && (
                  <td className='border px-4 py-2'>
                    {new Date(poi.createdAt).toLocaleString()}
                  </td>
                )}
                {visibleColumns.updatedAt && (
                  <td className='border px-4 py-2'>
                    {new Date(poi.updatedAt).toLocaleString()}
                  </td>
                )}
                {visibleColumns.details && (
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
                        onClick={() => handleDelete(poi.id)}
                        className='rounded bg-red-100 p-2 text-red-600 hover:bg-red-200'
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                )}
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
            {t("Previous")}
          </button>
          <span>
            {t("Page")} {currentPage} {t("of")}{" "}
            {filteredPOIs.length > 0
              ? Math.ceil(filteredPOIs.length / pageSize)
              : "1"}
          </span>
          <button
            onClick={() => handlePageChange("next")}
            disabled={currentPage === Math.ceil(filteredPOIs.length / pageSize)}
            className='px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50'
          >
            {t("Next")}
          </button>
        </div>
      </div>
    </DefaultLayout>
  )
}
