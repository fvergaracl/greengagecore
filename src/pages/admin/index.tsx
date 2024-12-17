import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "../../components/AdminLayout"
export default function Admin() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName='Profile' />
      <h1>Admin</h1>
    </DefaultLayout>
  )
}
