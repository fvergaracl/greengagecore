import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/router"
import axios from "axios"
import Swal from "sweetalert2"
import "survey-core/defaultV2.min.css"
import "survey-creator-core/survey-creator-core.min.css"
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react"

// Types
interface TaskFormProps {
  mode: "create" | "edit"
  poiId?: string
  initialData?: {
    title: string
    description: string
    type: "form" | "instruction" | "recogida de dato"
    surveyJSON: object
  }
}

const creatorOptions = {
  isAutoSave: true,
  showLogicTab: false
}

export default function TaskForm({ mode, poiId, initialData }: TaskFormProps) {
  const router = useRouter()

  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [type, setType] = useState<"form" | "instruction" | "recogida de dato">(
    initialData?.type || "form"
  )
  const [saving, setSaving] = useState(false)

  const [creator] = useState(() => {
    const newCreator = new SurveyCreator(creatorOptions)
    newCreator.onModified.add(() => {
      console.log("Autosaved Survey:", newCreator.JSON)
    })
    return newCreator
  })

  useEffect(() => {
    if (initialData?.surveyJSON) {
      creator.JSON = initialData.surveyJSON
    }
  }, [initialData, creator])

  const handleSave = useCallback(async () => {
    if (!title || !description || !type) {
      Swal.fire({
        icon: "error",
        title: "Missing Fields",
        text: "Title, description, and type are required."
      })
      return
    }

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
      console.log("***************************1")
      console.log("***************************2")
      console.log("***************************3")
      console.log(creator)
      if (!creator?.isJSONCorrect) {
        Swal.fire({
          icon: "error",
          title: "Invalid Survey",
          text: "The survey is invalid. Please correct it before saving."
        })
        return
      }
      if (creator?.JSON === {}) {
        Swal.fire({
          icon: "error",
          title: "Empty Survey",
          text: "The survey is empty. Please design the survey before saving."
        })
        return
      }

      const payload = {
        title,
        description,
        type,
        taskData: creator.JSON,
        poiId
      }

      const response =
        mode === "create"
          ? await axios.post("/api/admin/tasks", payload)
          : await axios.put(`/api/admin/tasks/${poiId}`, payload)

      if (response.status === 201 || response.status === 200) {
        Swal.fire({
          icon: "success",
          title: mode === "create" ? "Task Created" : "Task Updated",
          text: `The task was successfully ${
            mode === "create" ? "created" : "updated"
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
  }, [poiId, mode, title, description, type, creator, router])

  return (
    <>
      <div className='p-6 max-w-6xl mx-auto bg-white rounded-lg shadow-md dark:bg-gray-800'>
        <h1 className='text-3xl font-bold text-gray-800 dark:text-white mb-6'>
          {mode === "create" ? "Create a New Task" : "Edit Task"}
        </h1>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            Title
          </label>
          <input
            type='text'
            value={title}
            onChange={e => setTitle(e.target.value)}
            className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            required
          />
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            required
          />
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            Type
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value as any)}
            className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            required
          >
            <option value='form'>Form</option>
            <option value='instruction'>Instruction</option>
            <option value='recogida de dato'>Recogida de Dato</option>
          </select>
        </div>

        <div className='mb-6'>
          <p className='text-gray-600 dark:text-gray-300'>
            Use the Survey Creator below to{" "}
            {mode === "create"
              ? "design a new survey"
              : "edit the existing survey"}
            .
          </p>
        </div>

        <SurveyCreatorComponent creator={creator} />

        <div className='flex justify-end mt-6'>
          <button
            className='px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded hover:bg-green-600'
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : mode === "create"
              ? "Create Task"
              : "Update Task"}
          </button>
        </div>
      </div>
    </>
  )
}
