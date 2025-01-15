import DefaultLayout from "@/components/AdminLayout"
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb"
import { useTranslation } from "@/hooks/useTranslation"
import dynamic from "next/dynamic"
const PoisForm = dynamic(
  () => import("../../../components/AdminLayout/PoisForm"),
  { ssr: false }
)

export default function CreateAreaPage() {
  const { t } = useTranslation()
  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={t("Create Point of Interest")}
        breadcrumbPath={t("Points of Interest / Create")}
      />
      <PoisForm />
    </DefaultLayout>
  )
}
