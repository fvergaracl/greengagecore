import React, { useState, useEffect } from "react"
import axios from "axios"
import { useRouter } from "next/router"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons"
import { RiUserCommunityFill } from "react-icons/ri"
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "@/components/AdminLayout"
import ColumnSelector from "@/components/Admin/ColumnSelector"
import { useTranslation } from "@/hooks/useTranslation"
import Swal from "sweetalert2"

export default function AdminUsersActivityLogs() {
  const { t } = useTranslation()
  const router = useRouter()
  const [userActivityLogs, setUserActivityLogs] = useState<Task[]>([])
  const [filteredUserActivityLogs, setFilteredUserActivityLogs] = useState<
    Task[]
  >([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const fetchUsersLogs = async () => {
      try {
        const response = await axios.get("/api/admin/activity-logs/users")
        console.log(response.data)
        setUserActivityLogs(response.data)
        setFilteredUserActivityLogs(response.data)
      } catch (error) {
        console.error("Error fetching users logs:", error)
      }
    }
    fetchUsersLogs()
  }, [])

  return (
    <DefaultLayout>
      <Breadcrumb
        icon={<RiUserCommunityFill />}
        pageName={t("Users Activity Logs")}
        breadcrumbPath={t("Users Activity Logs")}
      />
    </DefaultLayout>
  )
}
