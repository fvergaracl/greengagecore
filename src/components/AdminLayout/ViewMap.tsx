import React, { useMemo } from "react"
import {
  MapContainer,
  TileLayer,
  Polygon,
  Tooltip,
  useMap
} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-defaulticon-compatibility"
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css"
import L from "leaflet"

interface Props {
  polygons?: {
    id: string
    name: string
    description: string
    polygon: [number, number][]
  }[]
}

const FitBounds = ({ polygons }: { polygons: Props["polygons"] }) => {
  const map = useMap()

  useMemo(() => {
    if (polygons && polygons.length > 0) {
      // Calculamos los límites de todos los polígonos
      const bounds = L.latLngBounds(
        polygons.flatMap(polygon =>
          polygon.polygon.map(([lat, lng]) => [lat, lng])
        )
      )

      // Ajustamos el mapa para que encaje dentro de esos límites
      map.fitBounds(bounds, { padding: [20, 20] }) // Opcional: margen de 20px
    }
  }, [polygons, map])

  return null
}

const colors = [
  { border: "blue", fill: "lightblue" },
  { border: "red", fill: "pink" },
  { border: "green", fill: "lightgreen" },
  { border: "purple", fill: "plum" },
  { border: "orange", fill: "peachpuff" }
]

export default function ViewMap({ polygons }: Props) {
  return (
    <div className='h-full rounded-lg shadow-md relative'>
      {polygons && polygons.length > 0 ? (
        <MapContainer
          center={[0, 0]} // Placeholder, se ajustará automáticamente con FitBounds
          zoom={2} // Placeholder, se ajustará automáticamente con FitBounds
          scrollWheelZoom={false}
          className='h-full rounded-lg'
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          {polygons.map((polygon, index) => {
            const color = colors[index % colors.length] // Ciclar a través de los colores
            return (
              <Polygon
                key={polygon.id}
                positions={polygon.polygon}
                pathOptions={{
                  color: color.border,
                  fillColor: color.fill,
                  fillOpacity: 0.5
                }}
              >
                <Tooltip>{polygon.name}</Tooltip>
              </Polygon>
            )
          })}
          <FitBounds polygons={polygons} />
        </MapContainer>
      ) : (
        <div
          className='flex items-center justify-center h-full bg-gray-100 text-gray-700 text-center'
          data-cy='no-areas-message'
        >
          <p>No areas defined.</p>
        </div>
      )}
    </div>
  )
}
