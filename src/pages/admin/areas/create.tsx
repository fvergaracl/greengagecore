import DefaultLayout from "../../../components/AdminLayout"
import dynamic from "next/dynamic"

const AreaForm = dynamic(
  () => import("../../../components/AdminLayout/AreaForm"),
  { ssr: false }
)
import { useRouter } from "next/router"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
export default function CreateAreaPage() {
  const router = useRouter()

  return (
    <DefaultLayout>
      <Breadcrumb pageName='Create Area' breadcrumbPath='Area / Create' />
      <AreaForm
        onSuccess={() => {
          router.push("/admin/areas")
        }}
      />
    </DefaultLayout>
  )
}
