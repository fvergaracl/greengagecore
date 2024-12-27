import DefaultLayout from "../../../../components/AdminLayout"
import dynamic from "next/dynamic"

const PoisForm = dynamic(
  () => import("../../../../components/AdminLayout/PoisForm")
)
import { useRouter } from "next/router"
import Breadcrumb from "../../../../components/Breadcrumbs/Breadcrumb"

export default function EditAreaPage() {
  const router = useRouter()
  const { id } = router.query

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={id ? `Edit POI ${id}` : "Edit POI"}
        breadcrumbPath='POI / Edit'
      />
      {id ? <PoisForm poiId={id as string} /> : <p>Loading...</p>}
    </DefaultLayout>
  )
}
