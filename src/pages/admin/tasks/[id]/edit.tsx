import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import DefaultLayout from "../../../../components/AdminLayout"
import Breadcrumb from "../../../../components/Breadcrumbs/Breadcrumb"
import TaskForm from "../../../../components/AdminLayout/TaskForm"

import axios from "axios"

export default function EditTaskPage() {
  const router = useRouter()
  const { id } = router.query
  const [initialData, setInitialData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      const fetchTask = async () => {
        try {
          const { data } = await axios.get(`/api/admin/tasks/${id}`)
          setInitialData({
            title: data.title,
            description: data.description,
            type: data.type,
            surveyJSON: data.taskData
          })
        } catch (error) {
          console.error("Failed to fetch task details", error)
        } finally {
          setLoading(false)
        }
      }

      fetchTask()
    }
  }, [id])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!initialData) {
    return <div>Task not found.</div>
  }

  return (
    <DefaultLayout>
      <Breadcrumb pageName='Edit Task' breadcrumbPath={`Tasks > ${id}`} />
      <TaskForm
        mode='edit'
        poiId={id as string}
        initialData={initialData}
      />{" "}
    </DefaultLayout>
  )
}
