import React, { useState } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { useDashboard } from "../../context/DashboardContext"
import { useRouter } from "next/router"
import axios from "axios"
import Swal from "sweetalert2"

interface SettingsProps {
  user: {
    name?: string
    email?: string
    picture?: string
    pictureKeycloak?: string
  }
}

export default function Settings({ user }: SettingsProps) {
  const { setUser } = useDashboard()
  const router = useRouter()
  const [photoUrl, setPhotoUrl] = useState(
    user?.pictureKeycloak[0] || user?.picture[0] || null
  )

  const handleLogout = () => {
    document.cookie = "access_token=; Max-Age=0; path=/" // Elimina la cookie
    setUser(null) // Limpia el contexto
    router.push("/") // Redirige al inicio
  }

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
          title: "¡Éxito!",
          text: "Foto actualizada correctamente",
          timer: 5000,
          timerProgressBar: true
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: response?.data?.error || "Error al actualizar la foto"
        })
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error?.response?.data?.error || "Algo salió mal"
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const avatar = photoUrl
  const getInitials = (name?: string) => {
    if (!name) return "NN" // Si el nombre no está definido, devuelve "NN" (No Name)
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
  }

  return (
    <DashboardLayout>
      <div className='p-6 max-w-4xl mx-auto'>
        <h1 className='text-3xl font-bold text-gray-800 mb-6'>Ajustes</h1>

        {/* Información del usuario */}
        <div className='bg-white shadow-md rounded-lg p-6 mb-6 flex items-center'>
          <div className='w-20 h-20 flex-shrink-0 rounded-full bg-gray-200 overflow-hidden'>
            {avatar ? (
              <img
                src={avatar}
                alt='Foto de perfil'
                className='w-full h-full object-cover'
              />
            ) : (
              <div className='flex items-center justify-center w-full h-full bg-blue-500 text-white text-xl font-bold'>
                {getInitials(user?.name)}
              </div>
            )}
          </div>
          <div className='ml-6'>
            <p className='text-gray-600'>Nombre:</p>
            <p className='font-medium text-gray-800'>
              {user?.name || "Sin nombre"}
            </p>
            <p className='text-gray-600 mt-2'>Email:</p>
            <p className='font-medium text-gray-800'>
              {user?.email || "Sin email"}
            </p>
          </div>
        </div>

        {/* Subir foto */}
        <div className='bg-white shadow-md rounded-lg p-6 mb-6'>
          <h2 className='text-xl font-semibold text-gray-700 mb-4'>
            Editar Foto
          </h2>
          <div className='flex flex-col items-center'>
            {avatar ? (
              <img
                src={avatar}
                alt='Foto de perfil'
                className='w-24 h-24 rounded-full object-cover mb-4'
              />
            ) : (
              <div className='w-24 h-24 rounded-full bg-gray-200 mb-4 flex items-center justify-center'>
                <span className='text-gray-500'>Sin Foto</span>
              </div>
            )}
            <label className='cursor-pointer bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600'>
              Subir Foto
              <input
                type='file'
                accept='image/*'
                onChange={handleFileChange}
                className='hidden'
              />
            </label>
          </div>
        </div>

        {/* Cambiar idioma */}
        <div className='bg-white shadow-md rounded-lg p-6 mb-6'>
          <h2 className='text-xl font-semibold text-gray-700 mb-4'>Idioma</h2>
          <div>
            <select
              className='w-full p-2 border rounded-lg text-gray-700 bg-gray-50'
              onChange={e =>
                console.log(`Idioma cambiado a: ${e.target.value}`)
              }
            >
              <option value='es'>Español</option>
              <option value='en'>Inglés</option>
            </select>
          </div>
        </div>

        {/* Botón para salir */}
        <div className='text-right'>
          <button
            onClick={handleLogout}
            className='py-2 px-4 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600'
          >
            Salir
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
