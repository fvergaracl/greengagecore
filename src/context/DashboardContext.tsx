import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect
} from "react"

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
  const [isTracking, setIsTracking] = useState(true)

  const toggleTracking = () => {
    setIsTracking(prev => !prev)
  }

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
        console.log("Ubicación actualizada:", newPosition)
      },
      error => {
        console.error("Error fetching location:", error)
      }
    )
  }

  useEffect(() => {
    const interval = setInterval(updatePosition, 1000)
    updatePosition() // Obtener la posición inicial
    return () => clearInterval(interval)
  }, [isTracking])

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
        setMapCenter
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}
