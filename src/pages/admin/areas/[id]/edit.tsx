import { useRouter } from "next/router"
import DefaultLayout from "@/components/AdminLayout"
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb"
import { useTranslation } from "@/hooks/useTranslation"
import dynamic from "next/dynamic"

const AreaForm = dynamic(
  () => import("../../../../components/AdminLayout/AreaForm")
)

export default function EditAreaPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = router.query

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={id ? `${t("Edit Area")} ${id}` : t("Edit Area")}
        breadcrumbPath={t("Area / Edit")}
      />
      {id ? <AreaForm areaId={id as string} /> : <p>{t("Loading...")}</p>}
    </DefaultLayout>
  )
}
