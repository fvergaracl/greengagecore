import { FiMapPin } from "react-icons/fi"
import { TbLassoPolygon } from "react-icons/tb"
import L from "leaflet"
import { useMap } from "react-leaflet"
import { Position, CampaignData } from "./types"

interface MapControlsProps {
  position: Position | null
  campaignData: CampaignData | null
}

const MapControls: React.FC<MapControlsProps> = ({
  position,
  campaignData
}) => {
  const map = useMap()

  const focusOnCurrentLocation = () => {
    if (position) {
      map.setView([position.lat, position.lng], 16)
      console.log("Focusing on current location:", position)
    } else {
      console.warn("Position is not available.")
    }
  }

  const focusOnCampaign = () => {
    if (campaignData?.areas) {
      const bounds = L.latLngBounds([])
      campaignData.areas.forEach((area: any) => {
        area.polygon.forEach(([lat, lng]: [number, number]) => {
          bounds.extend([lat, lng])
        })
      })
      map.fitBounds(bounds)
      console.log("Focusing on campaign area.")
    } else {
      console.warn("Campaign data is not available.")
    }
  }

  return (
    <div className='absolute bottom-4 right-4 z-99999 flex flex-col gap-2'>
      <button
        onClick={focusOnCampaign}
        className={`p-3 ${
          campaignData?.areas
            ? "bg-green-500 hover:bg-green-600"
            : "bg-gray-300"
        } text-white rounded-full shadow-md focus:outline-none`}
        title='Enfocar campaña'
        disabled={!campaignData?.areas}
      >
        <TbLassoPolygon size={24} />
      </button>
      <button
        onClick={focusOnCurrentLocation}
        className={`p-3 ${
          position ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-300"
        } text-white rounded-full shadow-md focus:outline-none`}
        title='Mi ubicación'
        disabled={!position}
      >
        <FiMapPin size={24} />
      </button>
    </div>
  )
}

export default MapControls
