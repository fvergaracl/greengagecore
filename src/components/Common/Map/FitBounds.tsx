import { useEffect } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import { PolygonData } from "./types"

interface FitBoundsProps {
  polygons: PolygonData[]
}

const FitBounds: React.FC<FitBoundsProps> = ({ polygons }) => {
  const map = useMap()

  useEffect(() => {
    if (polygons.length > 0 && polygons.some(p => p.polygon.length > 0)) {
      // Lógica de ajuste
    } else {
      console.warn("No polygons with valid coordinates to fit bounds.")
    }
    if (polygons && polygons.length > 0) {
      const latLngs: L.LatLngTuple[] = polygons.flatMap(polygon =>
        polygon.polygon
          .map(([lat, lng]) =>
            typeof lat === "number" && typeof lng === "number"
              ? [lat, lng]
              : null
          )
          .filter((point): point is L.LatLngTuple => point !== null)
      )

      if (latLngs.length > 0) {
        const bounds = L.latLngBounds(latLngs)
        map.fitBounds(bounds, { padding: [10, 10] })
      } else {
        console.warn("No valid lat/lng pairs found in polygons.")
      }
    }
  }, [polygons, map])

  return null
}

export default FitBounds
