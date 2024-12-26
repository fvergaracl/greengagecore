import React, { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { useDashboard } from "../../context/DashboardContext"
import axios from "axios"
import Swal from "sweetalert2"

const locales = {
  en: { label: "English", flag: "🇺🇸" },
  es: { label: "Español", flag: "🇪🇸" },
  nl: { label: "Nederlands", flag: "🇳🇱" },
  it: { label: "Italiano", flag: "🇮🇹" }
}

export default function Settings() {
  const { setUser, logout, user } = useDashboard()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get("/api/auth/user")
        const userData = response.data
        console.log({ userData })
        setUser({
          id: userData.sub,
          name: userData.name,
          email: userData.email,
          picture: userData.picture,
          pictureKeycloak: userData.pictureKeycloak,
          roles: userData.roles,
          locale: userData.locale
        })

        setPhotoUrl(userData.pictureKeycloak || userData.picture || null)
      } catch (error) {
        console.error("Error fetching user data:", error)

        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to load user information. You will be redirected to the login page.",
          timer: 10000,
          showConfirmButton: true,
          confirmButtonText: "Ok"
        }).then(() => {
          logout()
        })
      }
    }

    fetchUser()
  }, [])

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await axios.put("/api/updatePhotoUser", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      })

      if (response.status === 200) {
        const newPhotoUrl = response.data.url
        setPhotoUrl(newPhotoUrl)

        setUser((prev: any) => ({
          ...prev,
          picture: newPhotoUrl,
          pictureKeycloak: newPhotoUrl
        }))

        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Photo updated successfully"
        })
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Failed to upload the photo"
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return "NN"
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
  }
  return (
    <DashboardLayout>
      <div className='p-6 max-w-4xl mx-auto'>
        <h1
          className='text-3xl font-bold text-gray-800 mb-6'
          data-cy='settings-screen-title'
        >
          Settings
        </h1>

        <div className='bg-white shadow-md rounded-lg p-6 mb-6 flex items-center'>
          <div className='w-20 h-20 rounded-full bg-gray-200 overflow-hidden'>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt='Profile Picture'
                className='w-full h-full object-cover'
              />
            ) : (
              <div className='flex items-center justify-center w-full h-full bg-blue-500 text-white text-xl font-bold'>
                {getInitials(user?.name)}
              </div>
            )}
          </div>
          <div className='ml-6'>
            <p className='text-gray-600'>User ID:</p>
            <p className='font-medium text-gray-800'>{user?.id || "No ID"}</p>
            <hr className='my-4' />

            <p className='text-gray-600' data-cy='settings-user-name-label'>
              Name:
            </p>
            <p
              className='font-medium text-gray-800'
              data-cy='settings-user-name'
            >
              {user?.name || "No Name"}
            </p>
            <p
              className='text-gray-600 mt-2'
              data-cy='settings-user-email-label'
            >
              Email:
            </p>
            <p
              className='font-medium text-gray-800'
              data-cy='settings-user-email'
            >
              {user?.email || "No Email"}
            </p>
            {user?.roles && user.roles.length > 0 ? (
              <>
                <p className='text-gray-600 mt-4 mb-2'>Roles:</p>
                <div className='flex flex-wrap gap-2'>
                  {user.roles.map((role: string) => (
                    <span
                      key={role}
                      className='inline-block bg-blue-100 text-blue-800 text-sm font-medium py-1 px-3 rounded-lg shadow-sm'
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className='text-gray-500 mt-4'>No roles assigned.</p>
            )}
            <p className='text-gray-600 mt-4'>Language:</p>
            <div className='font-medium text-gray-800 flex items-center gap-2'>
              <span>{locales[user?.locale]?.flag || "🌍"}</span>
              <span>{locales[user?.locale]?.label || "Unknown Locale"}</span>
            </div>
          </div>
        </div>

        <div className='bg-white shadow-md rounded-lg p-6 mb-6'>
          <h2
            className='text-xl font-semibold text-gray-700 mb-4'
            data-cy='settings-edit-photo-title'
          >
            Edit Profile Photo
          </h2>
          <div className='flex flex-col items-center'>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt='Profile'
                className='w-24 h-24 rounded-full object-cover mb-4'
              />
            ) : (
              <div className='w-24 h-24 rounded-full bg-gray-200 mb-4 flex items-center justify-center'>
                <span className='text-gray-500'>No Photo</span>
              </div>
            )}
            <label className='cursor-pointer bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600'>
              Upload Photo
              <input
                type='file'
                accept='image/*'
                onChange={handleFileChange}
                className='hidden'
              />
            </label>
          </div>
        </div>

        <div className='text-right'>
          <button
            onClick={() => {
              logout()
            }}
            className='py-2 px-4 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600'
          >
            Logout
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
