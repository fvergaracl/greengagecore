import DefaultLayout from "../../../components/AdminLayout"
import dynamic from "next/dynamic"

const PoisForm = dynamic(
  () => import("../../../components/AdminLayout/PoisForm"),
  { ssr: false }
)
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
export default function CreateAreaPage() {
  return (
    <DefaultLayout>
      <Breadcrumb
        pageName='Create Point of Interest'
        breadcrumbPath='Points of Interest / Create'
      />
      <PoisForm />
    </DefaultLayout>
  )
}
