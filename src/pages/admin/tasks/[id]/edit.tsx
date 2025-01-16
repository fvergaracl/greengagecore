import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import DefaultLayout from "@/components/AdminLayout"
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb"
import TaskForm from "@/components/AdminLayout/TaskForm"
import { useTranslation } from "@/hooks/useTranslation"
import axios from "axios"

interface SurveyElement {
  name: string
  type: string
  title: string
}

interface SurveyPage {
  name: string
  elements: SurveyElement[]
}

interface TaskData {
  pages: SurveyPage[]
}

interface Campaign {
  id: string
  name: string
}

interface Area {
  id: string
  name: string
  campaign: Campaign
}

interface PointOfInterest {
  id: string
  name: string
  area: Area
}

interface Task {
  id: string
  title: string
  description: string
  type: string
  taskData: TaskData
  responseLimit: number | null
  responseLimitInterval: number | null
  availableFrom: string | null
  availableTo: string | null
  isDisabled: boolean
  pointOfInterestId: string
  createdAt: string
  updatedAt: string
  pointOfInterest: PointOfInterest | null
}

interface InitialData {
  title: string
  description: string
  type: "Form" | "Instruction" | "Data collection"
  surveyJSON: TaskData
}

export default function EditTaskPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = router.query
  const [poiId, setPoiId] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<InitialData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (id) {
      const fetchTask = async () => {
        try {
          const { data }: { data: Task } = await axios.get(
            `/api/admin/tasks/${id}`
          )
          console.log({ data })
          setPoiId(data.pointOfInterest?.id)
          setInitialData({
            title: data.title,
            description: data.description,
            type: data.type as "Form" | "Instruction" | "Data collection",
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
      <Breadcrumb
        pageName={t("Edit Task")}
        breadcrumbPath={`${t("Tasks")} > ${id}`}
      />
      <TaskForm
        mode='edit'
        poiId={poiId}
        taskId={id as string}
        initialData={initialData}
      />{" "}
    </DefaultLayout>
  )
}
