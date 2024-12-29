import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/router"
import axios from "axios"
import DefaultLayout from "../../../components/AdminLayout"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
import Swal from "sweetalert2"
import "survey-core/defaultV2.min.css"
import "survey-creator-core/survey-creator-core.min.css"
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react"

// Types
interface POI {
  id: string
  name: string
}

const surveyJson = {
  elements: [
    { name: "FirstName", title: "Enter your first name:", type: "text" },
    { name: "LastName", title: "Enter your last name:", type: "text" }
  ]
}

const creatorOptions = {
  isAutoSave: true,
  showLogicTab: false
}

// Hook for fetching POI details
const usePOIDetails = (poiId?: string) => {
  const [poi, setPoi] = useState<POI | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!poiId) return

    const fetchPoiDetails = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`/api/admin/pois/${poiId}`)
        setPoi(data)
      } catch (err) {
        console.error("Error fetching POI details:", err)
        setError("Failed to fetch POI details.")
      } finally {
        setLoading(false)
      }
    }

    fetchPoiDetails()
  }, [poiId])

  return { poi, error, loading }
}

export default function NewTask() {
  const router = useRouter()
  const { poiId } = router.query as { poiId?: string }

  const { poi, error, loading: poiLoading } = usePOIDetails(poiId)
  const [saving, setSaving] = useState(false)

  const [isCreating, setIsCreating] = useState(true) // Toggle between create/edit
  const [creator] = useState(() => {
    const newCreator = new SurveyCreator(creatorOptions)
    newCreator.onModified.add(() => {
      console.log("Survey autosaved", newCreator.JSON)
    })
    return newCreator
  })

  const handleSurveySave = useCallback(
    async (surveyJSON: object) => {
      if (!poiId) {
        Swal.fire({
          icon: "error",
          title: "Invalid POI",
          text: "A valid Point of Interest is required to save the task."
        })
        return
      }

      setSaving(true)
      try {
        const response = await axios.post("/api/admin/tasks", {
          title: isCreating ? "New Survey Task" : "Updated Survey Task",
          description: "Survey designed with Survey Creator.",
          type: "survey",
          taskData: surveyJSON,
          poiId
        })

        if (response.status === 201) {
          Swal.fire({
            icon: "success",
            title: isCreating ? "Task Created" : "Task Updated",
            text: `The survey task was successfully ${
              isCreating ? "created" : "updated"
            }.`
          })
          router.push(`/admin/pois/${poiId}/tasks`)
        }
      } catch (err) {
        console.error("Error saving task:", err)
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to save the task. Please try again."
        })
      } finally {
        setSaving(false)
      }
    },
    [poiId, isCreating, router]
  )

  if (poiLoading) {
    return (
      <DefaultLayout>
        <div className='flex items-center justify-center h-screen'>
          <p className='text-gray-500 text-lg'>Loading...</p>
        </div>
      </DefaultLayout>
    )
  }

  if (error) {
    return (
      <DefaultLayout>
        <div className='flex items-center justify-center h-screen'>
          <p className='text-red-500 text-lg'>{error}</p>
        </div>
      </DefaultLayout>
    )
  }

  if (!poi) {
    return null // Handle invalid POI scenario gracefully
  }

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName='New Survey Task'
        breadcrumbPath={`Tasks > ${poi.name}`}
      />
      <div className='p-6 max-w-6xl mx-auto bg-white rounded-lg shadow-md dark:bg-gray-800'>
        <h1 className='text-3xl font-bold text-gray-800 dark:text-white mb-6'>
          {isCreating ? "Create a New Survey Task" : "Edit Survey Task"} for
          POI: {poi.name}
        </h1>
        <div className='mb-6'>
          <p className='text-gray-600 dark:text-gray-300'>
            Use the Survey Creator below to{" "}
            {isCreating ? "design your new survey" : "edit the existing survey"}
            . Once you're done, click the save button in the editor to save the
            task.
          </p>
        </div>
        <div className='flex justify-between items-center mb-4'>
          <button
            className='px-4 py-2 text-sm font-semibold text-white bg-blue-500 rounded hover:bg-blue-600'
            onClick={() => setIsCreating(!isCreating)}
          >
            {isCreating ? "Switch to Edit Mode" : "Switch to Create Mode"}
          </button>
          <button
            className='px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded hover:bg-green-600'
            onClick={() => handleSurveySave(creator.JSON)}
          >
            {saving ? "Saving..." : "Save Task"}
          </button>
        </div>
        <SurveyCreatorComponent creator={creator} />
      </div>
    </DefaultLayout>
  )
}
