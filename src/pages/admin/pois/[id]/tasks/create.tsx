import DefaultLayout from "@/components/AdminLayout"
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb"
import TaskForm from "@/components/AdminLayout/TaskForm"
import { useRouter } from "next/router"
import { useTranslation } from "@/hooks/useTranslation"
export default function NewTaskPage() {
  const router = useRouter()
  const { id } = router.query as { id?: string }
  const { t } = useTranslation()
  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={t("Create task")}
        breadcrumbPath={t("Points of Interest / Tasks / Create")}
      />
      <TaskForm
        mode='create'
        poiId={id || null}
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
