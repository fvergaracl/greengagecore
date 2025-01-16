import React, { useState, useEffect, useRef } from "react"
import { useAdmin } from "../../../context/AdminContext"
import axios from "axios"
import Swal from "sweetalert2"
import { useRouter } from "next/router"
import { useTranslation } from "@/hooks/useTranslation"
const DropdownUser = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const { setUser, logout, user } = useAdmin()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const lastFetchTime = useRef<number | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const now = Date.now()
      if (lastFetchTime.current && now - lastFetchTime.current < 60000) {
        // If the last fetch was less than 1 minute ago, don't fetch again
        return
      }

      try {
        const response = await axios.get("/api/auth/user")
        const userData = response.data
        setUser({
          sub: userData.sub,
          name: userData.name,
          email: userData.email,
          picture: userData.picture,
          pictureKeycloak: userData.pictureKeycloak,
          roles: userData.roles
        })

        setPhotoUrl(userData.pictureKeycloak || userData.picture || null)
        lastFetchTime.current = now 
      } catch (error) {
        console.error("Error fetching user data:", error)
        Swal.fire({
          icon: "error",
          title: t("Error"),
          text: t("Failed to load user information")
        })
        logout()
      }
    }

    fetchUser()
  }, [setUser, t, logout])

  return (
    <div className='relative'>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className='flex items-center gap-2 focus:outline-none'
      >
        <div className='text-right hidden lg:block'>
          <p className='text-sm font-medium text-black'>
            {user?.name || t("No Name")}
          </p>
          <p className='text-xs text-gray-500'>
            {user?.email || t("No Email")}
          </p>
        </div>
        <div className='w-10 h-10 rounded-full bg-gray-300'>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt='User'
              className='w-full h-full rounded-full object-cover'
            />
          ) : null}
        </div>
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className='absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50'>
          <ul className='text-sm text-gray-700'>
            <li>
              <button
                onClick={() => router.push("/dashboard")}
                className='w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700'
                data-cy='profile-button-dropdown'
              >
                {t("Go to App")}
              </button>
            </li>
            {/* divider*/}
            <li>
              <hr />
            </li>

            <li>
              <button
                onClick={() => logout()}
                className='w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700'
                data-cy='logout-button-dropdown'
              >
                {t("Log Out")}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default DropdownUser
