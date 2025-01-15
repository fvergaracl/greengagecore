import React, { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { useDashboard } from "../../context/DashboardContext"
import { useTranslation } from "@/hooks/useTranslation"
import LanguageDropdown from "@/components/Common/LanguageDropdown"
import axios from "axios"
import Swal from "sweetalert2"

export default function Settings() {
  const { t } = useTranslation()
  const { setUser, logout, user } = useDashboard()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get("/api/auth/user")
        const userData = response.data
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
          text: t(
            "Failed to load user information. You will be redirected to the login page."
          ),
          timer: 10000,
          showConfirmButton: true,
          confirmButtonText: t("Ok")
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
          title: t("Success!"),
          text: t("Photo updated successfully")
        })
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: t("Oops..."),
        text: t("Failed to upload the photo")
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
          {t("Settings")}
        </h1>

        <div className='bg-white shadow-md rounded-lg p-6 mb-6 flex items-center'>
          <div className='w-20 h-20 rounded-full bg-gray-200 overflow-hidden'>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt='Profile Picture'
                className='w-full h-full object-cover'
                data-cy='settings-profile-photo'
              />
            ) : (
              <div
                className='flex items-center justify-center w-full h-full bg-blue-500 text-white text-xl font-bold'
                data-cy='settings-profile-initials'
              >
                {getInitials(user?.name)}
              </div>
            )}
          </div>
          <div className='ml-6'>
            <p className='text-gray-600'>{t("User ID")}:</p>
            <p className='font-medium text-gray-800'>
              {user?.id || t("No ID")}
            </p>
            <hr className='my-4' />

            <p className='text-gray-600' data-cy='settings-user-name-label'>
              {t("Name")}:
            </p>
            <p
              className='font-medium text-gray-800'
              data-cy='settings-user-name'
            >
              {user?.name || t("No Name")}
            </p>
            <p
              className='text-gray-600 mt-2'
              data-cy='settings-user-email-label'
            >
              {t("Email")}:
            </p>
            <p
              className='font-medium text-gray-800'
              data-cy='settings-user-email'
            >
              {user?.email || t("No Email")}
            </p>
            {user?.roles && user.roles.length > 0 ? (
              <>
                <p
                  className='text-gray-600 mt-4 mb-2'
                  data-cy='settings-user-roles-label'
                >
                  {t("Roles")}:
                </p>
                <div className='flex flex-wrap gap-2'>
                  {user.roles.map((role: string) => (
                    <span
                      key={role}
                      className='inline-block bg-blue-100 text-blue-800 text-sm font-medium py-1 px-3 rounded-lg shadow-sm'
                      data-cy='settings-user-role'
                    >
                      {t(role)}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className='text-gray-500 mt-4' data-cy='settings-no-roles'>
                {t("No roles assigned")}.
              </p>
            )}

            <div className='font-medium text-gray-800 flex items-center gap-2'>
              <LanguageDropdown />
            </div>
          </div>
        </div>

        <div className='bg-white shadow-md rounded-lg p-6 mb-6'>
          <h2
            className='text-xl font-semibold text-gray-700 mb-4'
            data-cy='settings-edit-photo-title'
          >
            {t("Edit Profile Photo")}
          </h2>
          <div className='flex flex-col items-center'>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt='Profile'
                className='w-24 h-24 rounded-full object-cover mb-4'
                data-cy='settings-profile-photo'
              />
            ) : (
              <div className='w-24 h-24 rounded-full bg-gray-200 mb-4 flex items-center justify-center'>
                <span className='text-gray-500' data-cy='settings-no-photo'>
                  {t("No Photo")}
                </span>
              </div>
            )}
            <label
              className='cursor-pointer bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600'
              data-cy='settings-upload-photo-button'
            >
              {t("Upload Photo")}
              <input
                type='file'
                accept='image/*'
                onChange={handleFileChange}
                className='hidden'
                data-cy='settings-upload-photo-input'
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
            data-cy='settings-logout-button'
          >
            {t("Logout")}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
