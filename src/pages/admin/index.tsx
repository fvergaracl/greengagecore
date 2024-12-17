import React from "react"
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "../../components/AdminLayout"
export default function Admin() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName='Admin Home' breadcrumbPath='Home' />
      <h1>Admin</h1>
    </DefaultLayout>
  )
}
