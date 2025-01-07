import { useRouter } from "next/router"
import { ReactNode, useEffect, useState } from "react"
import {
  MdHome,
  MdSettings,
  MdEmojiEvents,
  MdAdminPanelSettings,
  MdLocationOn
} from "react-icons/md"

import { useDashboard } from "../context/DashboardContext"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isTracking, toggleTracking } = useDashboard()
  const [isAdministrator, setIsAdministrator] = useState(false)
  const handleNavigation = (path: string) => {
    router.push(path)
  }

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/auth/token", {
          method: "GET",
          credentials: "include"
        })
        const data = await response.json()

        const decodedToken = JSON.parse(
          Buffer.from(data?.access_token?.split(".")[1], "base64")?.toString()
        )
        if (decodedToken?.roles?.includes("admin")) {
          setIsAdministrator(true)
        }
      } catch (error) {
        console.error("Error fetching token:", error)
      }
    }

    fetchToken()
  }, [])

  return (
    <div className='h-screen flex flex-col bg-gray-100'>
      <div className='flex-grow overflow-auto'>{children}</div>
      <nav className='h-16 bg-gray-800 flex items-center justify-around text-white'>
        <button
          className='flex flex-col items-center'
          onClick={() => handleNavigation("/dashboard")}
          data-cy='home-button'
        >
          <MdHome className='h-6 w-6' />
          <span className='text-xs'>Home</span>
        </button>
        <button
          className='flex flex-col items-center'
          onClick={() => handleNavigation("/dashboard/campaigns")}
          data-cy='campaigns-button'
        >
          <MdEmojiEvents className='h-6 w-6' />
          <span className='text-xs'>Campaign</span>
        </button>
        <button
          className='flex flex-col items-center'
          onClick={() => handleNavigation("/dashboard/leaderboard")}
          data-cy='leaderboard-button'
        >
          <MdEmojiEvents className='h-6 w-6' />
          <span className='text-xs'>Leaderboard</span>
        </button>
        <button
          className='flex flex-col items-center'
          onClick={toggleTracking}
          data-cy='location-button'
        >
          <MdLocationOn
            className={`h-6 w-6 ${
              isTracking ? "text-green-500" : "text-red-500"
            }`}
          />
          <span className='text-xs' data-cy='location-button-text'>
            {isTracking ? "Stop" : "Activate"} location
          </span>
        </button>
        <button
          className='flex flex-col items-center'
          onClick={() => handleNavigation("/dashboard/settings")}
          data-cy='settings-button'
        >
          <MdSettings className='h-6 w-6' />
          <span className='text-xs'>Settings</span>
        </button>
        {isAdministrator && (
          <button
            className='flex flex-col items-center'
            onClick={() => handleNavigation("/admin")}
            data-cy='admin-button'
          >
            <MdAdminPanelSettings className='h-6 w-6' />
            <span className='text-xs'>Admin</span>
          </button>
        )}
      </nav>
    </div>
  )
}
