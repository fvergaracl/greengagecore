import DefaultLayout from "../../../components/AdminLayout"
import dynamic from "next/dynamic"

const AreaForm = dynamic(
  () => import("../../../components/AdminLayout/AreaForm"),
  { ssr: false }
)
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
export default function CreateAreaPage() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName='Create Point of Interest' breadcrumbPath='Points of Interest / Create' />
      <AreaForm />
    </DefaultLayout>
  )
}
