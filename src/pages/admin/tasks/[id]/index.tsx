import React, { useEffect, useState } from "react"
import { useRouter } from "next/router"
import axios from "axios"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons"
import { Survey, Model } from "survey-react-ui"
import { MdOutlineAssignment } from "react-icons/md"
import Breadcrumb from "../../../../components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "../../../../components/AdminLayout"

interface TaskDetails {
  id: string
  title: string
  description: string | null
  type: string
  disabled: boolean
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
  taskData: Record<string, any>
  created_at: string
  updated_at: string
}

export default function TaskDetailsPage() {
  const router = useRouter()
  const { id } = router.query
  const [task, setTask] = useState<TaskDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return

    const fetchTaskDetails = async () => {
      try {
        const response = await axios.get(`/api/admin/tasks/${id}`)
        setTask(response.data)
      } catch (err) {
        console.error("Failed to fetch task details:", err)
        setError("Failed to load task details.")
      } finally {
        setLoading(false)
      }
    }

    fetchTaskDetails()
  }, [id])

  const handleEdit = () => {
    if (task) {
      router.push(`/admin/tasks/${task.id}/edit`)
    }
  }

  const handleDelete = async () => {
    if (task) {
      try {
        await axios.delete(`/api/admin/tasks/${task.id}`)
        router.push("/admin/tasks")
      } catch (err) {
        console.error("Failed to delete task:", err)
        setError("Failed to delete task.")
      }
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div className='text-red-500'>{error}</div>
  }

  if (!task) {
    return <div>No task found.</div>
  }

  const surveyModel = new Model(task.taskData)

  return (
    <DefaultLayout>
      <Breadcrumb
        icon={<MdOutlineAssignment />}
        pageName={task.title}
        breadcrumbPath={`Tasks / ${task.title}`}
      />

      <div className='overflow-x-auto rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark'>
        <h1 className='text-2xl font-bold text-gray-800 dark:text-white mb-4'>
          Task Details
        </h1>

        <div className='space-y-4'>
          <div>
            <strong className='text-gray-700 dark:text-gray-300'>Title:</strong>
            <p className='text-gray-800 dark:text-white'>{task.title}</p>
          </div>

          <div>
            <strong className='text-gray-700 dark:text-gray-300'>
              Description:
            </strong>
            <p className='text-gray-800 dark:text-white'>
              {task.description || "N/A"}
            </p>
          </div>

          <div>
            <strong className='text-gray-700 dark:text-gray-300'>Type:</strong>
            <p className='text-gray-800 dark:text-white'>{task.type}</p>
          </div>

          <div>
            <strong className='text-gray-700 dark:text-gray-300'>
              Associated POI:
            </strong>
            <p className='text-gray-800 dark:text-white'>
              {task.pointOfInterest.name}
            </p>
          </div>

          <div>
            <strong className='text-gray-700 dark:text-gray-300'>Area:</strong>
            <p className='text-gray-800 dark:text-white'>
              {task.pointOfInterest.area.name}
            </p>
          </div>

          <div>
            <strong className='text-gray-700 dark:text-gray-300'>
              Campaign:
            </strong>
            <p className='text-gray-800 dark:text-white'>
              {task.pointOfInterest.area.campaign.name}
            </p>
          </div>

          <strong className='text-gray-700 dark:text-gray-300'>
            Task Preview:
          </strong>
          <div className='border border-gray-300 rounded p-4 bg-gray-50 dark:bg-gray-800'>
            <Survey model={surveyModel} />
            <p className='text-sm text-gray-500 mt-2'>
              This is a preview of the task form.
            </p>
          </div>

          <div>
            <strong className='text-gray-700 dark:text-gray-300'>
              Created At:
            </strong>
            <p className='text-gray-800 dark:text-white'>
              {new Date(task.created_at).toLocaleString()}
            </p>
          </div>

          <div>
            <strong className='text-gray-700 dark:text-gray-300'>
              Updated At:
            </strong>
            <p className='text-gray-800 dark:text-white'>
              {new Date(task.updated_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className='mt-6 flex gap-4'>
          <button
            onClick={handleEdit}
            className='px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600'
          >
            Edit Task
          </button>
         
        </div>
      </div>
    </DefaultLayout>
  )
}
