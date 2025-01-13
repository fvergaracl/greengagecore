import DefaultLayout from "../../../components/AdminLayout"
import dynamic from "next/dynamic"
import { useTranslation } from "@/hooks/useTranslation"
const AreaForm = dynamic(
  () => import("../../../components/AdminLayout/AreaForm"),
  { ssr: false }
)
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
export default function CreateAreaPage() {
  const { t } = useTranslation()

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={t("Create Area")}
        breadcrumbPath={t("Area / Create")}
      />
      <AreaForm />
    </DefaultLayout>
  )
}
