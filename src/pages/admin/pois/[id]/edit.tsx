import DefaultLayout from "../../../../components/AdminLayout"
import dynamic from "next/dynamic"

const AreaForm = dynamic(
  () => import("../../../../components/AdminLayout/AreaForm")
)
import { useRouter } from "next/router"
import Breadcrumb from "../../../../components/Breadcrumbs/Breadcrumb"

export default function EditAreaPage() {
  const router = useRouter()
  const { id } = router.query

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={id ? `Edit Area ${id}` : "Edit Area"}
        breadcrumbPath='Area / Edit'
      />
      {id ? (
        <AreaForm
          areaId={id as string}
          onSuccess={() => {
            router.push("/admin/areas")
          }}
        />
      ) : (
        <p>Loading...</p>
      )}
    </DefaultLayout>
  )
}
