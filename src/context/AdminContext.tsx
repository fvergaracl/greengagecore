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

export interface AdminContextType {
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

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error("useAdmin must be used within a AdminProvider")
  }
  return context
}

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize persisted state client-side only
  useEffect(() => {
    const initializeState = () => {
      const persistedUser = getPersistedState<User | null>("admin_user", null)

      setUser(persistedUser)
      setLoading(false)
    }

    if (typeof window !== "undefined") {
      initializeState()
    }
  }, [])

  // Persist state changes
  useEffect(() => {
    if (!loading) persistState("admin_user", user)
  }, [user, loading])

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
    <AdminContext.Provider
      value={{
        user,
        setUser,
        loading,
        logout
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}
