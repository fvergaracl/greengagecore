import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import axios from "axios"
import Swal from "sweetalert2"
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
  useMapEvents,
  Polygon
} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import CustomMarker from "../marker"
import ReactDOMServer from "react-dom/server"

interface CenterMapProps {
  center: [number, number]
}

const CenterMap: React.FC<CenterMapProps> = ({ center }) => {
  const map = useMap()

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])

  return null
}

interface POIFormProps {
  poiId?: string
  onSuccess?: () => void
}

const POIForm: React.FC<POIFormProps> = ({ poiId, onSuccess }) => {
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    radius: 20,
    latitude: 51.505,
    longitude: -0.09,
    areaId: ""
  })

  const [areas, setAreas] = useState<{ id: string; name: string }[]>([])
  const [selectedArea, setSelectedArea] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const createCustomIcon = (color: string, size: number) => {
    const markerHtml = ReactDOMServer.renderToString(
      <CustomMarker markerColor={color} size={size} />
    )

    return L.divIcon({
      html: markerHtml,
      className: "custom-marker",
      iconSize: [size, size],
      iconAnchor: [size / 2, size]
    })
  }

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await axios.get("/api/admin/areas")
        setAreas(response.data)
      } catch (err) {
        console.error("Failed to fetch areas:", err)
        setError("Failed to load areas. Please try again.")
      }
    }

    const fetchPOI = async () => {
      if (poiId) {
        try {
          setLoading(true)
          const response = await axios.get(`/api/admin/pois/${poiId}`)
          setFormValues({
            name: response.data.name,
            description: response.data.description || "",
            radius: response.data.radius || 15,
            latitude: response.data.latitude || 51.505,
            longitude: response.data.longitude || -0.09,
            areaId: response.data.area.id || ""
          })
          setSelectedArea(response.data.area)
          setLoading(false)
        } catch (err) {
          console.error(err)
          setError("Failed to fetch POI details.")
          setLoading(false)
        }
      }
    }

    fetchAreas()
    fetchPOI()
  }, [poiId])

  const validateForm = () => {
    const missingFields: string[] = []
    if (!formValues.name.trim()) missingFields.push("Name")
    if (!formValues.areaId.trim()) missingFields.push("Associated Area")

    if (missingFields.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Missing Fields",
        html: `Please fill the following fields:<br><b>${missingFields.join(
          ", "
        )}</b>`,
        timer: 5000,
        timerProgressBar: true
      })
      return false
    }
    return true
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormValues(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formValues.name.trim() || !formValues.areaId.trim()) {
      Swal.fire({
        icon: "error",
        title: "Missing Fields",
        text: "Please fill in all required fields."
      })
      return
    }

    setLoading(true)
    setError(null)
    const isInsidePolygon = require("point-in-polygon")

    if (!selectedArea) {
      Swal.fire({
        title: "Invalid Area",
        text: "Please select a valid area.",
        icon: "error"
      })
      setLoading(false)
      return
    }

    if (
      selectedArea &&
      !isInsidePolygon(
        [formValues.latitude, formValues.longitude],
        selectedArea.polygon
      )
    ) {
      Swal.fire({
        title: "Invalid Location",
        text: "The POI must be inside the selected area polygon.",
        icon: "error"
      })
      setLoading(false)
      return
    }
    try {
      const message = poiId
        ? "Updating point of interest..."
        : "Creating point of interest..."

      Swal.fire({
        title: message,
        icon: "info",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false
      })
      let response = null

      if (poiId) {
        response = await axios.put(`/api/admin/pois/${poiId}`, {
          ...formValues,
          radius: parseInt(formValues.radius)
        })
      } else {
        response = await axios.post("/api/admin/pois", formValues)
      }
      if (response.status !== 200 && response.status !== 201) {
        const errorMsg = `Failed to ${
          poiId ? "update" : "create"
        } the point of interest. Please try again.`

        Swal.fire({
          title: "Error",
          text: errorMsg,
          icon: "error"
        })
        setLoading(false)
        return
      }
      setLoading(false)
      Swal.fire({
        title: "Success!",
        text: `Point of interest ${
          poiId ? "updated" : "created"
        } successfully!`,
        icon: "success",
        timer: 3000,
        showConfirmButton: false
      })

      if (onSuccess) onSuccess()
      else router.back()
    } catch (err) {
      console.error(err)
      Swal.fire({
        title: "Error",
        text: "Failed to save the point of interest. Please try again.",
        icon: "error"
      })
      setLoading(false)
    }
  }

  const MapClickHandler = () => {
    useMapEvents({
      click: e => {
        const { lat, lng } = e.latlng
        setFormValues(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }))
      }
    })
    return null
  }

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const areaId = e.target.value
    setFormValues(prev => ({ ...prev, areaId }))

    const area = areas.find(a => a.id === areaId)
    if (area) {
      setSelectedArea(area)
    }
  }

  const MapZoomHandler = () => {
    const map = useMap()

    useEffect(() => {
      if (selectedArea) {
        const bounds = L.latLngBounds(
          selectedArea.polygon.map(([lat, lng]) => [lat, lng])
        )
        map.fitBounds(bounds)
      }
    }, [selectedArea, map])

    return null
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md dark:bg-gray-800'
    >
      <a
        onClick={() => router.back()}
        className='text-blue-600 cursor-pointer mb-4 inline-block'
        data-cy='poi-form-back-link'
      >
        ← Back
      </a>

      {error && <p className='text-red-500 mb-4'>{error}</p>}

      <div className='mb-4'>
        <label
          htmlFor='name'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          Name <span className='text-red-500'>*</span>
        </label>
        <input
          type='text'
          id='name'
          name='name'
          value={formValues.name}
          onChange={handleChange}
          required
          className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
        />
      </div>
      <div className='mb-4'>
        <label
          htmlFor='description'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          Description
        </label>
        <input
          type='text'
          id='description'
          name='description'
          value={formValues.description}
          onChange={handleChange}
          className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
        />
      </div>
      <div className='mb-4 grid grid-cols-2 gap-4'>
        <div>
          <label htmlFor='latitude' className='block text-sm font-medium'>
            Latitude
          </label>
          <input
            type='text'
            id='latitude'
            value={formValues.latitude}
            disabled
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700'
          />
        </div>
        <div>
          <label htmlFor='longitude' className='block text-sm font-medium'>
            Longitude
          </label>
          <input
            type='text'
            id='longitude'
            value={formValues.longitude}
            disabled
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700'
          />
        </div>
      </div>

      <div className='mb-4'>
        <label
          htmlFor='radius'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          Radius (meters)
        </label>
        <input
          type='number'
          id='radius'
          name='radius'
          value={formValues.radius}
          onChange={handleChange}
          min={1}
          className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
        />
      </div>

      <div className='mb-4'>
        <label
          htmlFor='areaId'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          Associated Area <span className='text-red-500'>*</span>
        </label>
        <select
          id='areaId'
          name='areaId'
          value={formValues.areaId}
          onChange={handleAreaChange}
          required
          className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-green-200 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
        >
          <option value=''>Select an Area</option>
          {areas.map(area => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>

      <div className='mb-4 h-96'>
        <MapContainer
          center={[formValues.latitude, formValues.longitude]}
          zoom={18}
          scrollWheelZoom={true}
          className='h-full rounded-md'
          data-cy='poi-form-map'
        >
          <CenterMap center={[formValues.latitude, formValues.longitude]} />
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          />
          <MapClickHandler />
          <MapZoomHandler />
          {selectedArea && (
            <Polygon
              positions={selectedArea?.polygon?.map(([lat, lng]) => [lat, lng])}
              pathOptions={{ color: "green", fillOpacity: 0.2 }}
            />
          )}
          <Marker
            position={[formValues.latitude, formValues.longitude]}
            icon={createCustomIcon("blue", 36)}
          />

          <Circle
            center={[formValues.latitude, formValues.longitude]}
            radius={formValues.radius}
            pathOptions={{ color: "blue", fillOpacity: 0.2 }}
          />
        </MapContainer>
      </div>

      <button
        type='submit'
        className='mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring focus:ring-blue-200 dark:bg-blue-700 dark:hover:bg-blue-600'
        disabled={loading}
      >
        {loading ? "Saving..." : poiId ? "Update POI" : "Create POI"}
      </button>
    </form>
  )
}

export default POIForm
