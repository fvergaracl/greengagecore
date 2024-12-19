import { useState, useEffect } from "react"
import axios from "axios"
import Swal from "sweetalert2"
import { MapContainer, TileLayer, Polygon, FeatureGroup } from "react-leaflet"
import { EditControl } from "react-leaflet-draw"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"

interface SubCampaignFormProps {
  subCampaignId?: string // If provided, the form will be in edit mode
  onSuccess?: () => void // Callback after successful create/edit
}

const SubCampaignForm: React.FC<SubCampaignFormProps> = ({
  subCampaignId,
  onSuccess
}) => {
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    polygon: null as number[][] | null,
    campaignId: ""
  })
  const [loading, setLoading] = useState(false)
  const [allCampaigns, setAllCampaigns] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (subCampaignId) {
      const fetchSubCampaign = async () => {
        try {
          setLoading(true)
          const response = await axios.get(
            `/api/admin/subcampaigns/${subCampaignId}`
          )
          setFormValues({
            name: response.data.name,
            description: response.data.description || "",
            polygon: response.data.polygon || null,
            campaignId: response.data.campaignId || ""
          })
          setLoading(false)
        } catch (err) {
          console.error(err)
          setError("Failed to fetch sub-campaign details.")
          setLoading(false)
        }
      }
      fetchSubCampaign()
    }
  }, [subCampaignId])

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get("/api/admin/campaigns/names")
        setAllCampaigns(response.data)
      } catch (err) {
        console.error("Failed to fetch campaigns:", err)
      }
    }

    fetchCampaigns()
  }, [])

  const validateForm = () => {
    const missingFields: string[] = []

    if (!formValues.name.trim()) missingFields.push("Name")
    if (!formValues.campaignId.trim()) missingFields.push("Parent Campaign")
    if (!formValues.polygon || formValues.polygon.length < 3)
      missingFields.push("Polygon (at least 3 points)")

    if (missingFields.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Missing Fields",
        html: `Please fill the following fields:<br><b>${missingFields.join(
          ", "
        )}</b>`
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

  const handlePolygonChange = (polygonCoords: number[][]) => {
    setFormValues(prev => ({ ...prev, polygon: polygonCoords }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const swalMessage = subCampaignId
        ? "Updating sub-campaign..."
        : "Creating sub-campaign..."

      Swal.fire({
        title: swalMessage,
        icon: "info",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false
      })

      if (subCampaignId) {
        await axios.put(`/api/admin/subcampaigns/${subCampaignId}`, formValues)
      } else {
        await axios.post("/api/admin/subcampaigns", formValues)
      }

      setLoading(false)
      Swal.fire({
        title: "Success!",
        text: `Sub-campaign ${
          subCampaignId ? "updated" : "created"
        } successfully!`,
        icon: "success",
        timer: 3000,
        showConfirmButton: false
      })

      if (onSuccess) onSuccess()
    } catch (err) {
      console.error(err)
      Swal.fire({
        title: "Error",
        text: "Failed to save the sub-campaign. Please try again.",
        icon: "error"
      })
      setLoading(false)
    }
  }

  return (
    <div className='flex space-x-6'>
      <form
        onSubmit={handleSubmit}
        className='w-1/2 bg-white p-6 rounded-lg shadow-md dark:bg-gray-800'
      >
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
        <div className='mb-4'>
          <label
            htmlFor='campaignId'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300'
          >
            Parent Campaign <span className='text-red-500'>*</span>
          </label>
          {/* <input
            type='text'
            id='campaignId'
            name='campaignId'
            value={formValues.campaignId}
            onChange={handleChange}
            required
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
          /> */}
          <select
            id='campaignId'
            name='campaignId'
            value={formValues.campaignId}
            onChange={handleChange}
            required
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
          >
            <option value=''>Select Campaign</option>
            {allCampaigns?.map(campaign => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type='submit'
          className='mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring focus:ring-blue-200 dark:bg-blue-700 dark:hover:bg-blue-600'
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : subCampaignId
            ? "Update Sub-Campaign"
            : "Create Sub-Campaign"}
        </button>
      </form>

      <div className='w-1/2 h-96'>
        <MapContainer
          center={[51.505, -0.09]}
          zoom={13}
          scrollWheelZoom={false}
          className='h-full rounded-lg shadow-md'
        >
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          />
          {formValues.polygon && (
            <Polygon
              positions={formValues.polygon}
              pathOptions={{ color: "blue", fillOpacity: 0.4 }}
            />
          )}
          <FeatureGroup>
            <EditControl
              position='topright'
              onEdited={e => {
                const layers = e.layers
                layers.eachLayer(layer => {
                  if (layer instanceof L.Polygon) {
                    handlePolygonChange(
                      layer
                        .getLatLngs()[0]
                        .map((latlng: L.LatLng) => [latlng.lat, latlng.lng])
                    )
                  }
                })
              }}
              onCreated={e => {
                const layer = e.layer
                if (layer instanceof L.Polygon) {
                  handlePolygonChange(
                    layer
                      .getLatLngs()[0]
                      .map((latlng: L.LatLng) => [latlng.lat, latlng.lng])
                  )
                }
              }}
              onDeleted={() => handlePolygonChange([])}
              draw={{
                polygon: { allowIntersection: false },
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false
              }}
            />
          </FeatureGroup>
        </MapContainer>
      </div>
    </div>
  )
}

export default SubCampaignForm
