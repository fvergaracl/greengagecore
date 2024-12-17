import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDashboard } from "../../context/DashboardContext"
import axios from "axios"
import Swal from "sweetalert2"

const DropdownUser = () => {
  const { setUser, logout, user } = useDashboard()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get("/api/auth/user")
        const userData = response.data

        setUser({
          name: userData.name,
          email: userData.email,
          picture: userData.picture,
          pictureKeycloak: userData.pictureKeycloak
        })

        setPhotoUrl(userData.pictureKeycloak || userData.picture || null)
      } catch (error) {
        console.error("Error fetching user data:", error)
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to load user information."
        })
        logout()
        router.push("/login")
      }
    }

    fetchUser()
  }, [])

  return (
    <div className='relative'>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className='flex items-center gap-2 focus:outline-none'
      >
        <div className='text-right hidden lg:block'>
          <p className='text-sm font-medium text-black'>
            {user?.name || "No Name"}
          </p>
          <p className='text-xs text-gray-500'>{user?.email || "No Email"}</p>
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
                onClick={() => logout()}
                className='w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700'
              >
                Log Out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default DropdownUser
