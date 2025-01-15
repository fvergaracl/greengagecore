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
    if (!(polygons?.length > 0 && polygons?.some(p => p.polygon.length > 0))) {
      console.warn("No polygons with valid coordinates to fit bounds.")
    }
    if (polygons && polygons.length > 0) {
      const latLngs = polygons.map(polygon =>
        polygon.polygon.map(([lat, lng]) => new L.LatLng(lat, lng))
      )
      const bounds = new L.LatLngBounds(latLngs.flat())
      map.fitBounds(bounds)

      console.log("Fitting bounds to", bounds)
    }
  }, [polygons, map])

  return null
}

export default FitBounds
