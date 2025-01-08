import { useRouter } from "next/router"
import { ReactNode, useEffect, useState } from "react"
import {
  MdHome,
  MdSettings,
  MdEmojiEvents,
  MdAdminPanelSettings,
  MdLocationOn
} from "react-icons/md"
import clsx from "clsx"
import { useTranslation } from "@/hooks/useTranslation"
import { useDashboard } from "../context/DashboardContext"

interface DashboardLayoutProps {
  children: ReactNode
}

interface NavItem {
  label: string
  icon: JSX.Element
  path?: string
  onClick?: () => void
  isVisible?: boolean
  dataCy: string
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { isTracking, toggleTracking } = useDashboard()
  const [isAdministrator, setIsAdministrator] = useState<boolean>(false)

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const decodeToken = (token: string): { roles?: string[] } | null => {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      )
      return payload
    } catch {
      console.error("Invalid token format")
      return null
    }
  }

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/auth/token", {
          method: "GET",
          credentials: "include"
        })
        if (!response.ok) {
          throw new Error("Failed to fetch token")
        }
        const { access_token } = await response.json()
        const decodedToken = decodeToken(access_token)
        if (decodedToken?.roles?.includes("admin")) {
          setIsAdministrator(true)
        }
      } catch (error) {
        console.error("Error fetching token:", error)
      }
    }

    fetchToken()
  }, [])

  const navItems: NavItem[] = [
    {
      label: t("Home"),
      icon: <MdHome className='h-6 w-6' />,
      path: "/dashboard",
      dataCy: "home-button"
    },
    {
      label: t("Campaigns"),
      icon: <MdEmojiEvents className='h-6 w-6' />,
      path: "/dashboard/campaigns",
      dataCy: "campaigns-button"
    },
    {
      label: t("Leaderboard"),
      icon: <MdEmojiEvents className='h-6 w-6' />,
      path: "/dashboard/leaderboard",
      dataCy: "leaderboard-button"
    },
    {
      label: isTracking ? t("Stop location") : t("Activate location"),
      icon: (
        <MdLocationOn
          className={clsx("h-6 w-6", {
            "text-green-500": isTracking,
            "text-red-500": !isTracking
          })}
        />
      ),
      onClick: toggleTracking,
      dataCy: "location-button"
    },
    {
      label: t("Settings"),
      icon: <MdSettings className='h-6 w-6' />,
      path: "/dashboard/settings",
      dataCy: "settings-button"
    },
    {
      label: t("Admin"),
      icon: <MdAdminPanelSettings className='h-6 w-6' />,
      path: "/admin",
      isVisible: isAdministrator,
      dataCy: "admin-button"
    }
  ]

  const renderNavButton = ({
    label,
    icon,
    path,
    onClick,
    isVisible = true,
    dataCy
  }: NavItem) => {
    if (!isVisible) return null

    return (
      <button
        key={label}
        className='flex flex-col items-center'
        onClick={onClick || (() => path && handleNavigation(path))}
        data-cy={dataCy}
      >
        {icon}
        <span className='text-xs'>{label}</span>
      </button>
    )
  }

  return (
    <div className='h-screen flex flex-col bg-gray-100'>
      <div className='flex-grow overflow-auto'>{children}</div>
      <nav className='h-16 bg-gray-800 flex items-center justify-around text-white'>
        {navItems.map(renderNavButton)}
      </nav>
    </div>
  )
}
