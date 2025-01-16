import React, { useState, useEffect } from "react"
import axios from "axios"
import { useRouter } from "next/router"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons"
import { MdOutlineAssignment } from "react-icons/md"
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "@/components/AdminLayout"
import ColumnSelector from "@/components/Admin/ColumnSelector"
import { useTranslation } from "@/hooks/useTranslation"
import Swal from "sweetalert2"

interface Task {
  id: string
  title: string
  description: string | null
  type: "form" | "instruction" | "data collection"
  taskData: {
    pages: {
      name: string
      elements: {
        name: string
        type: string
        title: string
      }[]
    }[]
  }
  responseLimit: number | null
  responseLimitInterval: number | null
  availableFrom: string | null
  availableTo: string | null
  isDisabled: boolean
  pointOfInterestId: string
  createdAt: string
  updatedAt: string
  pointOfInterest: {
    id: string
    name: string
    area: {
      id: string
      name: string
      campaign: {
        id: string
        name: string
      }
    }
  }
}

interface VisibleColumns {
  id: boolean
  title: boolean
  description: boolean
  type: boolean
  responseLimit: boolean
  responseLimitInterval: boolean
  availableFrom: boolean
  availableTo: boolean
  pointOfInterest: boolean
  campaign: boolean
  area: boolean
  createdAt: boolean
  updatedAt: boolean
  actions: boolean
}

export default function AdminTasks() {
  const { t } = useTranslation()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    id: true,
    title: true,
    description: true,
    type: true,
    responseLimit: true,
    responseLimitInterval: true,
    availableFrom: true,
    availableTo: true,
    pointOfInterest: true,
    campaign: true,
    area: true,
    createdAt: true,
    updatedAt: true,
    actions: true
  })

  const pageSize = 10

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get("/api/admin/tasks")
        console.log(response.data)
        setTasks(response.data)
        setFilteredTasks(response.data)
      } catch (err) {
        console.error("Failed to fetch tasks:", err)
      }
    }

    fetchTasks()
  }, [])

  useEffect(() => {
    const filtered = tasks.filter(
      task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description &&
          task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    setFilteredTasks(filtered)
    setCurrentPage(1)
  }, [searchQuery, tasks])

  const handleColumnToggle = (column: string) => {
    const newCampaingColumns = {
      ...visibleColumns,
      [column]: !visibleColumns[column]
    }

    setVisibleColumns(() => newCampaingColumns)
  }

  const handleView = (id: string) => {
    router.push(`/admin/tasks/${id}`)
  }

  const handleEdit = (id: string) => {
    router.push(`/admin/tasks/${id}/edit`)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await Swal.fire({
      title: t("Are you sure?"),
      text: t("This action cannot be undone"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Yes, delete it"),
      cancelButtonText: t("Cancel")
    })

    if (!confirmed.isConfirmed) {
      return
    }

    try {
      await axios.delete(`/api/admin/tasks/${id}`)
      const deletedTask = tasks.find(task => task.id === id)
      if (deletedTask) {
        setTasks(tasks.filter(task => task.id !== id))
      }
      Swal.fire({
        title: t("Task deleted"),
        icon: "success"
      })
    } catch (error) {
      console.error("Failed to delete task:", error)
      Swal.fire({
        title: t("Error"),
        text: t("Failed to delete task"),
        icon: "error"
      })
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handlePageChange = (direction: "prev" | "next") => {
    setCurrentPage(prev =>
      direction === "prev"
        ? Math.max(prev - 1, 1)
        : Math.min(prev + 1, Math.ceil(filteredTasks.length / pageSize))
    )
  }

  const startIndex = (currentPage - 1) * pageSize
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + pageSize)

  return (
    <DefaultLayout>
      <Breadcrumb
        icon={<MdOutlineAssignment />}
        pageName={t("Tasks")}
        breadcrumbPath={t("Tasks")}
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
            placeholder={t("Search by title or description")}
            value={searchQuery}
            onChange={handleSearchChange}
            className='w-full p-2 border border-gray-300 rounded-md focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
          />
        </div>

        <table className='min-w-full table-auto border-collapse'>
          <thead>
            <tr className='bg-gray-100 text-left text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300'>
              {visibleColumns.id && <th className='border px-2 py-2'>#</th>}
              {visibleColumns.title && (
                <th className='border px-2 py-2'>{t("Title")}</th>
              )}
              {visibleColumns.description && (
                <th className='border px-2 py-2'>{t("Description")}</th>
              )}
              {visibleColumns.type && (
                <th className='border px-2 py-2'>{t("Type")}</th>
              )}
              {visibleColumns.responseLimit && (
                <th className='border px-2 py-2'>{t("Response Limit")}</th>
              )}
              {visibleColumns.responseLimitInterval && (
                <th className='border px-2 py-2'>
                  {t("Response Limit Interval")}
                </th>
              )}
              {visibleColumns.availableFrom && (
                <th className='border px-2 py-2'>{t("Available From")}</th>
              )}
              {visibleColumns.availableTo && (
                <th className='border px-2 py-2'>{t("Available To")}</th>
              )}
              {visibleColumns.pointOfInterest && (
                <th className='border px-2 py-2'>{t("POI")}</th>
              )}
              {visibleColumns.area && (
                <th className='border px-2 py-2'>{t("Area")}</th>
              )}
              {visibleColumns.campaign && (
                <th className='border px-2 py-2'>{t("Campaign")}</th>
              )}
              {visibleColumns.createdAt && (
                <th className='border px-2 py-2'>{t("Created At")}</th>
              )}
              {visibleColumns.updatedAt && (
                <th className='border px-2 py-2'>{t("Updated At")}</th>
              )}

              {visibleColumns.actions && (
                <th className='border px-2 py-2'>{t("Actions")}</th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedTasks.map((task, index) => (
              <tr
                key={task.id}
                className='hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                <td className='border px-2 py-2'>{startIndex + index + 1}</td>
                {visibleColumns.title && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {task.title}
                  </td>
                )}
                {visibleColumns.description && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {task.description || "-"}
                  </td>
                )}
                {visibleColumns.type && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {t(task.type)}
                  </td>
                )}
                {visibleColumns.responseLimit && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {task.responseLimit || "-"}
                  </td>
                )}

                {visibleColumns.responseLimitInterval && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {task.responseLimitInterval || "-"}
                  </td>
                )}

                {visibleColumns.availableFrom && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {task.availableFrom || "-"}
                  </td>
                )}

                {visibleColumns.availableTo && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {task.availableTo || "-"}
                  </td>
                )}
                {visibleColumns.pointOfInterest && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {task.pointOfInterest.name}
                  </td>
                )}
                {visibleColumns.area && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {task.pointOfInterest.area.name}
                  </td>
                )}
                {visibleColumns.campaign && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {task.pointOfInterest.area.campaign.name}
                  </td>
                )}
                {visibleColumns.createdAt && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {new Date(task.createdAt).toLocaleDateString()}
                  </td>
                )}
                {visibleColumns.updatedAt && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </td>
                )}

                {visibleColumns.actions && (
                  <td className='border px-2 py-2 text-sm text-gray-600 dark:text-gray-400'>
                    <div className='flex gap-2'>
                      <button
                        title='View'
                        onClick={() => handleView(task.id)}
                        className='rounded bg-blue-100 p-2 text-blue-600 hover:bg-blue-200'
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        title='Edit'
                        onClick={() => handleEdit(task.id)}
                        className='rounded bg-yellow-100 p-2 text-yellow-600 hover:bg-yellow-200'
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        title='Delete'
                        onClick={() => handleDelete(task.id)}
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
            {filteredTasks.length > 0
              ? Math.ceil(filteredTasks.length / pageSize)
              : "1"}
          </span>
          <button
            onClick={() => handlePageChange("next")}
            disabled={
              currentPage === Math.ceil(filteredTasks.length / pageSize)
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
