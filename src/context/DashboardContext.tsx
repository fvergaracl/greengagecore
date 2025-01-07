import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect
} from "react"
import { getPersistedState, persistState } from "../utils/persistentState"

interface Position {
  lat: number
  lng: number
}

interface User {
  name: string
  email: string
}

interface DashboardContextType {
  user: User | null
  setUser: (user: User | null) => void
  position: Position | null
  updatePosition: () => void
  isTracking: boolean
  toggleTracking: () => void
  mapCenter: Position | null
  setMapCenter: (center: Position) => void
  selectedCampaign: any | null
  setSelectedCampaign: (campaign: any | null) => void
  loading: boolean
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
)

export const useDashboard = () => {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider")
  }
  return context
}

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [mapCenter, setMapCenter] = useState<Position | null>(null)
  const [isTracking, setIsTracking] = useState<boolean>(true)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const toggleTracking = () => setIsTracking(prev => !prev)

  const updatePosition = () => {
    if (!isTracking) return

    navigator.geolocation.getCurrentPosition(
      location => {
        const newPosition = {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        }
        setPosition(newPosition)
        if (!mapCenter) setMapCenter(newPosition)
      },
      error => {
        console.error("Error fetching location:", error)
      }
    )
  }

  // Initialize persisted state client-side only
  useEffect(() => {
    const initializeState = () => {
      const persistedUser = getPersistedState<User | null>(
        "dashboard_user",
        null
      )
      const persistedPosition = getPersistedState<Position | null>(
        "dashboard_position",
        null
      )
      const persistedMapCenter = getPersistedState<Position | null>(
        "dashboard_mapCenter",
        null
      )
      const persistedIsTracking = getPersistedState<boolean>(
        "dashboard_isTracking",
        true
      )
      const persistedCampaign = getPersistedState<string | null>(
        "dashboard_selectedCampaign",
        null
      )

      setUser(persistedUser)
      setPosition(persistedPosition)
      setMapCenter(persistedMapCenter)
      setIsTracking(persistedIsTracking)
      setSelectedCampaign(persistedCampaign)

      setLoading(false) // Finish loading
    }

    if (typeof window !== "undefined") {
      initializeState()
    }
  }, [])

  // Persist state changes
  useEffect(() => {
    if (!loading) persistState("dashboard_user", user)
  }, [user, loading])

  useEffect(() => {
    if (!loading) persistState("dashboard_position", position)
  }, [position, loading])

  useEffect(() => {
    if (!loading) persistState("dashboard_mapCenter", mapCenter)
  }, [mapCenter, loading])

  useEffect(() => {
    if (!loading) persistState("dashboard_isTracking", isTracking)
  }, [isTracking, loading])

  useEffect(() => {
    if (!loading) persistState("dashboard_selectedCampaign", selectedCampaign)
  }, [selectedCampaign, loading])

  useEffect(() => {
    const interval = setInterval(updatePosition, 1000)
    updatePosition()
    return () => clearInterval(interval)
  }, [isTracking])

  const logout = () => {
    document.cookie = "access_token=; Max-Age=0; path=/"

    localStorage.clear()
    setUser(null)
    window.location.href = "/api/auth/logout"
  }

  if (loading) {
    return (
      <div className='h-screen flex items-center justify-center'>
        <p className='text-gray-500'>Loading...</p>
      </div>
    )
  }

  return (
    <DashboardContext.Provider
      value={{
        user,
        setUser,
        position,
        updatePosition,
        isTracking,
        toggleTracking,
        mapCenter,
        setMapCenter,
        selectedCampaign,
        setSelectedCampaign,
        loading,
        logout
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}
