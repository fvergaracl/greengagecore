import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import axios from "axios"
import Swal from "sweetalert2"

interface CampaignFormProps {
  campaignId?: string
  onSuccess?: () => void
}

const CampaignForm: React.FC<CampaignFormProps> = ({
  campaignId,
  onSuccess
}) => {
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    isOpen: true,
    deadline: null as string | null,
    category: "",
    gameId: ""
  })
  const router = useRouter()
  const [hasDeadline, setHasDeadline] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (campaignId) {
      const fetchCampaign = async () => {
        try {
          setLoading(true)
          const response = await axios.get(`/api/admin/campaigns/${campaignId}`)
          setFormValues({
            name: response.data.name,
            description: response.data.description || "",
            isOpen: response.data.isOpen,
            deadline: response.data.deadline || null,
            category: response.data.category || "",
            gameId: response.data.gameId || ""
          })
          setHasDeadline(!!response.data.deadline)
          setLoading(false)
        } catch (err) {
          console.error(err)
          setError("Failed to fetch campaign details.")
          setLoading(false)
        }
      }

      fetchCampaign()
    }
  }, [campaignId])

  const validateForm = () => {
    const missingFields: string[] = []

    if (!formValues.name.trim()) missingFields.push("Name")
    if (!formValues.category.trim()) missingFields.push("Category")

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

  const handleDeadlineToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasDeadline(e.target.checked)
    if (!e.target.checked) {
      setFormValues(prev => ({ ...prev, deadline: null }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const swalMessage = campaignId
        ? "Updating campaign..."
        : "Creating campaign..."

      Swal.fire({
        title: swalMessage,
        icon: "info",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false
      })

      if (campaignId) {
        await axios.put(`/api/admin/campaigns/${campaignId}`, formValues)
      } else {
        await axios.post("/api/admin/campaigns", formValues)
      }

      setLoading(false)
      Swal.fire({
        title: "Success!",
        text: `Campaign ${campaignId ? "updated" : "created"} successfully!`,
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
        text: "Failed to save the campaign. Please try again.",
        icon: "error"
      })
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md dark:bg-gray-800'
    >
      <a
        onClick={() => router.back()}
        className='text-blue-600 cursor-pointer mb-4 inline-block'
        data-cy='campaign-form-back-link'
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
      <div className='mb-4'>
        <label
          htmlFor='description'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          Category <span className='text-red-500'>*</span>
        </label>
        <input
          type='text'
          id='category'
          name='category'
          value={formValues.category}
          onChange={handleChange}
          required
          className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
        />
      </div>
      <div className='mb-4'>
        <input
          type='checkbox'
          id='hasDeadline'
          checked={hasDeadline}
          onChange={handleDeadlineToggle}
        />
        <label
          htmlFor='hasDeadline'
          className='ml-2 text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          Set Deadline
        </label>
      </div>
      {hasDeadline && (
        <div className='mb-4'>
          <label
            htmlFor='deadline'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300'
          >
            Deadline
          </label>
          <input
            type='date'
            id='deadline'
            name='deadline'
            value={formValues.deadline || ""}
            onChange={handleChange}
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
          />
        </div>
      )}
      <div className='mb-4'>
        <label
          htmlFor='isOpen'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          Status
        </label>
        <select
          id='isOpen'
          name='isOpen'
          value={formValues.isOpen ? "true" : "false"}
          onChange={e =>
            setFormValues(prev => ({
              ...prev,
              isOpen: e.target.value === "true"
            }))
          }
          className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
        >
          <option value='true'>Open (Anyone can join)</option>
          <option value='false'>Closed (Invite-only)</option>
        </select>
      </div>
      <button
        type='submit'
        className='mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring focus:ring-blue-200 dark:bg-blue-700 dark:hover:bg-blue-600'
        disabled={loading}
      >
        {loading
          ? "Saving..."
          : campaignId
          ? "Update Campaign"
          : "Create Campaign"}
      </button>
    </form>
  )
}

export default CampaignForm
