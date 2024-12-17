import { useRouter } from "next/router"
import { ReactNode } from "react"
import {
  MdHome,
  MdSettings,
  MdEmojiEvents,
  MdLogout,
  MdLocationOn
} from "react-icons/md"
import { useDashboard } from "../context/DashboardContext"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isTracking, toggleTracking } = useDashboard()

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <div className='h-screen flex flex-col bg-gray-100'>
      <div className='flex-grow overflow-auto'>{children}</div>
      <nav className='h-16 bg-gray-800 flex items-center justify-around text-white'>
        <button
          className='flex flex-col items-center'
          onClick={() => handleNavigation("/dashboard")}
        >
          <MdHome className='h-6 w-6' />
          <span className='text-xs'>Inicio</span>
        </button>
        <button
          className='flex flex-col items-center'
          onClick={() => handleNavigation("/dashboard/campaigns")}
        >
          <MdEmojiEvents className='h-6 w-6' />
          <span className='text-xs'>Camapaña</span>
        </button>
        <button
          className='flex flex-col items-center'
          onClick={() => handleNavigation("/dashboard/leaderboard")}
        >
          <MdEmojiEvents className='h-6 w-6' />
          <span className='text-xs'>Leaderboard</span>
        </button>
        <button className='flex flex-col items-center' onClick={toggleTracking}>
          <MdLocationOn
            className={`h-6 w-6 ${
              isTracking ? "text-green-500" : "text-red-500"
            }`}
          />
          <span className='text-xs'>
            {isTracking ? "Detener" : "Activar"} ubicación
          </span>
        </button>
        <button
          className='flex flex-col items-center'
          onClick={() => handleNavigation("/dashboard/settings")}
        >
          <MdSettings className='h-6 w-6' />
          <span className='text-xs'>Ajustes</span>
        </button>
      </nav>
    </div>
  )
}
