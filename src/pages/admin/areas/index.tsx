import React, { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { useRouter } from "next/router"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons"
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "@/components/AdminLayout"
import ColumnSelector from "@/components/Admin/ColumnSelector"
import Swal from "sweetalert2"
import { useTranslation } from "@/hooks/useTranslation"

interface Area {
  id: string
  name: string
  description: string
  campaign: { id: string; name: string } // Parent Campaign
  disabled: boolean
  tasks: { id: string }[]
  createdAt: string
  updatedAt: string
}

interface VisibleColumns {
  id: boolean
  name: boolean
  description: boolean
  campaign: boolean
  details: boolean
  actions: boolean
  createdAt: boolean
  updatedAt: boolean
}

interface Campaign {
  id: string
  name: string
}

export default function AdminAreas() {
  const { t } = useTranslation()
  const router = useRouter()
  const [allAreas, setAllAreas] = useState<Area[]>([])
  const [filteredAreas, setFilteredAreas] = useState<Area[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    id: true,
    name: true,
    description: true,
    campaign: true,
    details: true,
    actions: true,
    createdAt: false,
    updatedAt: false
  })

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

  const handleDelete = useCallback(
    (id: string) => {
      Swal.fire({
        title: t("Are you sure?"),
        text: t(
          "If you do this, you will lose all the data related to this area (POIs, tasks, etc)."
        ),
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: t("Yes, delete it!"),
        cancelButtonText: t("Cancel")
      }).then(async result => {
        if (result.isConfirmed) {
          try {
            await axios.delete(`/api/admin/areas/${id}`)
            setAllAreas(prev => prev.filter(area => area.id !== id))
            Swal.fire(t("Deleted!"), t("The area has been deleted."), "success")
          } catch (error) {
            console.error("Error deleting area:", error)
            Swal.fire(t("Error"), t("Failed to delete the area."), "error")
          }
        }
      })
    },
    [t]
  )

  const handleColumnToggle = (column: string) => {
    const newCampaingColumns = {
      ...visibleColumns,
      [column]: !visibleColumns[column]
    }

    setVisibleColumns(prev => newCampaingColumns)
  }

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
      <Breadcrumb pageName={t("Areas")} breadcrumbPath={t("Areas")} />
      <div className='flex justify-end gap-4 mb-4'>
        <ColumnSelector
          visibleColumns={visibleColumns}
          onToggleColumn={handleColumnToggle}
        />
      </div>
      <div className='overflow-x-auto rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark'>
        <div className='flex items-center gap-4 mb-4'>
          {/* Search Bar */}
          <input
            type='text'
            placeholder={t("Search by name or description")}
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
            <option value=''>{t("All Campaigns")}</option>
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
              {visibleColumns.id && <th className='border px-2 py-2'>#</th>}
              {visibleColumns.name && (
                <th className='border px-2 py-2'>{t("Name")}</th>
              )}
              {visibleColumns.description && (
                <th className='border px-2 py-2'>{t("Description")}</th>
              )}
              {visibleColumns.campaign && (
                <th className='border px-2 py-2'>{t("Parent Campaign")}</th>
              )}
              {visibleColumns.details && (
                <th className='border px-2 py-2'>{t("Details")}</th>
              )}
              {visibleColumns.actions && (
                <th className='border px-2 py-2'>{t("Actions")}</th>
              )}

              {visibleColumns.createdAt && (
                <th className='border px-2 py-2'>{t("Created At")}</th>
              )}

              {visibleColumns.updatedAt && (
                <th className='border px-2 py-2'>{t("Updated At")}</th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedAreas.map((area, index) => (
              <tr
                key={area.id}
                className='hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                {visibleColumns.id && (
                  <td className='border px-4 py-2'>{startIndex + index + 1}</td>
                )}
                {visibleColumns.name && (
                  <td className='border px-4 py-2 font-medium text-gray-800 dark:text-white'>
                    {area.name}
                  </td>
                )}

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
                      onClick={() => handleDelete(area.id)}
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
            {t("Previous")}
          </button>
          <span>
            {t("Page")} {currentPage} {t("of")}{" "}
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
            {t("Next")}
          </button>
        </div>
      </div>
    </DefaultLayout>
  )
}
