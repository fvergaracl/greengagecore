import { useEffect, useState } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import dynamic from "next/dynamic"
import { useDashboard } from "../../context/DashboardContext"
import CampaignsScreen from "../../screens/CampaignsScreen"
import { useRouter } from "next/router"

const MapDashboard = dynamic(() => import("../../components/MapDashboard"), {
  ssr: false
})

export default function Dashboard() {
  const { position, selectedCampaign } = useDashboard()
  const [puntos, setPuntos] = useState([])
  const [poligonos, setPoligonos] = useState([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const router = useRouter()

  const { invite: campaignId } = router.query

  useEffect(() => {
    if (campaignId) {
      console.log("Invite campaign ID:", campaignId)
    }
  }, [campaignId])

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080")

    socket.onopen = () => {
      console.log("Connected to WebSocket server")
    }

    socket.onmessage = event => {
      const data = JSON.parse(event.data)

      // Actualizar puntos y polígonos en el estado
      if (data.puntos) setPuntos(data.puntos)
      if (data.poligonos) setPoligonos(data.poligonos)
    }

    socket.onclose = () => {
      console.log("WebSocket connection closed")
    }

    return () => {
      socket.close()
    }
  }, [])

  if (!selectedCampaign) {
    return (
      <DashboardLayout>
        <CampaignsScreen />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {!position ? (
        <Modal isVisible={isModalVisible}>
          <h2>Ubicación requerida</h2>
          <p>
            Necesitamos tu ubicación para continuar. Por favor, activa la
            ubicación.
          </p>
        </Modal>
      ) : (
        <MapDashboard
          puntos={puntos}
          poligonos={poligonos}
          position={position}
          selectedCampaign={selectedCampaign}
        />
      )}
    </DashboardLayout>
  )
}

// Simple Modal component
function Modal({
  isVisible,
  children
}: {
  isVisible: boolean
  children: React.ReactNode
}) {
  if (!isVisible) return null

  return (
    <div className='fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center'>
      <div className='bg-white p-4 rounded shadow'>{children}</div>
    </div>
  )
}
