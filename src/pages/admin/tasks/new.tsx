import DefaultLayout from "../../../components/AdminLayout"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
import TaskForm from "../../../components/AdminLayout/TaskForm"
import { useRouter } from "next/router"

export default function NewTaskPage() {
  const router = useRouter()
  const { poiId } = router.query as { poiId?: string }
  return (
    <DefaultLayout>
      <Breadcrumb
        pageName='Create Point of Interest'
        breadcrumbPath='Points of Interest / Create'
      />
      <TaskForm
        mode='create'
        poiId={poiId || ""}
        initialData={{
          title: "",
          description: "",
          type: "form",
          surveyJSON: {}
        }}
      />
    </DefaultLayout>
  )
}
