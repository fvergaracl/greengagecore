import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/router"
import axios from "axios"
import Swal from "sweetalert2"
import "survey-core/defaultV2.min.css"
import "survey-creator-core/survey-creator-core.min.css"
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react"
import GoBack from "@/components/Admin/GoBack"
import { useTranslation } from "@/hooks/useTranslation"

interface SurveyElement {
  name: string
  type: string
  title: string
}

interface SurveyPage {
  name: string
  elements: SurveyElement[]
}

interface TaskData {
  pages: SurveyPage[]
}

interface InitialData {
  title: string
  description: string
  type: "Form" | "Instruction" | "Data collection"
  surveyJSON: TaskData
  responseLimit?: number
  responseLimitInterval?: number
  availableFrom?: string
  availableTo?: string
}

interface TaskFormProps {
  mode: "create" | "edit"
  poiId?: string
  taskId?: string
  initialData?: InitialData
}

const creatorOptions = {
  isAutoSave: true,
  showLogicTab: false
}

export default function TaskForm({
  mode,
  poiId,
  taskId = undefined,
  initialData
}: TaskFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [type, setType] = useState<"Form" | "Instruction" | "Data collection">(
    initialData?.type || "Form"
  )
  const [responseLimit, setResponseLimit] = useState<number | null>(
    initialData?.responseLimit || null
  )
  const [responseLimitInterval, setResponseLimitInterval] = useState<
    number | null
  >(initialData?.responseLimitInterval || null)
  const [availableFrom, setAvailableFrom] = useState<string | null>(
    initialData?.availableFrom || null
  )
  const [availableTo, setAvailableTo] = useState<string | null>(
    initialData?.availableTo || null
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
        title: t("Missing Fields"),
        text: t("Title, description, and type are required")
      })
      return
    }

    if (!poiId && mode === "create") {
      Swal.fire({
        icon: "error",
        title: t("Invalid POI"),
        text: t("A valid Point of Interest is required to save the task")
      })
      return
    }
    if (!taskId && mode === "edit") {
      Swal.fire({
        icon: "error",
        title: t("Invalid Task"),
        text: t("A valid task is required to save the task")
      })
      return
    }

    setSaving(true)
    try {
      // responseLimit and responseLimitInterval are optional and should be number
      if (responseLimit && isNaN(responseLimit)) {
        Swal.fire({
          icon: "error",
          title: t("Invalid Response Limit"),
          text: t("Response limit should be a number")
        })
        return
      }
      if (responseLimitInterval && isNaN(responseLimitInterval)) {
        Swal.fire({
          icon: "error",
          title: t("Invalid Response Limit Interval"),
          text: t("Response limit (minutes) interval should be a number")
        })
        return
      }
      // availableFrom and availableTo are optional and should be string
      if (availableFrom && isNaN(Date.parse(availableFrom))) {
        Swal.fire({
          icon: "error",
          title: t("Invalid Available From"),
          text: t("Available from should be a valid date")
        })
        return
      }
      if (availableTo && isNaN(Date.parse(availableTo))) {
        Swal.fire({
          icon: "error",
          title: t("Invalid Available To"),
          text: t("Available to should be a valid date")
        })
        return
      }
      if (availableFrom && availableTo && availableFrom > availableTo) {
        Swal.fire({
          icon: "error",
          title: t("Invalid Dates"),
          text: t("Available from date should be before available to date")
        })
        return
      }

      if (creator?.JSON === {}) {
        Swal.fire({
          icon: "error",
          title: t("Empty Survey"),
          text: t("Please design a survey before saving the task")
        })
        return
      }

      const payload = {
        title,
        description,
        type,
        responseLimit,
        responseLimitInterval,
        availableFrom,
        availableTo,
        taskData: creator.JSON,
        poiId
      }
      console.log({ taskId })
      const response =
        mode === "create"
          ? await axios.post("/api/admin/tasks", payload)
          : await axios.put(`/api/admin/tasks/${taskId}`, payload)

      if (response.status === 201 || response.status === 200) {
        Swal.fire({
          icon: "success",
          title: mode === "create" ? t("Task Created") : t("Task Updated"),
          text: `${t("The task was successfully")} ${
            mode === "create" ? t("created") : t("updated")
          }.`
        })
        router.push(`/admin/pois/${poiId}`)
      }
    } catch (err) {
      console.error("Error saving task:", err)
      Swal.fire({
        icon: "error",
        title: t("Error"),
        text: t("Failed to save the task. Please try again")
      })
    } finally {
      setSaving(false)
    }
  }, [
    poiId,
    mode,
    title,
    description,
    type,
    responseLimit,
    responseLimitInterval,
    availableFrom,
    availableTo,
    creator,
    router,
    taskId,
    t
  ])

  return (
    <>
      <GoBack />
      <div className='p-6 max-w-6xl mx-auto bg-white rounded-lg shadow-md dark:bg-gray-800'>
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            {t("Title")}
            <span className='text-red-500'>*</span>
          </label>
          <input
            type='text'
            value={title}
            onChange={e => setTitle(e.target.value)}
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
            required
          />
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            {t("Description")}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
            required
          />
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            {t("Type")}
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value as any)}
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
            required
          >
            <option value='Form'>{t("Form")}</option>
            <option value='Instruction'>{t("Instruction")}</option>
            <option value='Data collection'>{t("Data collection")}</option>
          </select>
        </div>

        <div className='mb-6'>
          <p className='text-gray-600 dark:text-gray-300'>
            {t("Use the Survey Creator below to")}{" "}
            {mode === "create"
              ? t("design a new survey")
              : t("edit the existing survey")}
            .
          </p>
        </div>
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            <strong> {t("Response Limit")} </strong>
            <small>
              {" - "}
              {t("Number of responses allowed before the task is disabled")}
            </small>
          </label>
          <input
            type='number'
            value={responseLimit || ""}
            onChange={e =>
              setResponseLimit(e.target.value ? parseInt(e.target.value) : null)
            }
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
          />
        </div>

        {/* Response Limit Interval */}
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            <strong>{t("Response Limit Interval")}</strong>{" "}
            <small>
              {" - "}
              {t("Number of minutes to reset the response limit")}
            </small>
          </label>
          <input
            type='number'
            value={responseLimitInterval || ""}
            onChange={e =>
              setResponseLimitInterval(
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
          />
        </div>

        {/* Available From */}
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            {t("Available From")}
          </label>
          <input
            type='datetime-local'
            value={availableFrom || ""}
            onChange={e => setAvailableFrom(e.target.value || null)}
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
          />
        </div>

        {/* Available To */}
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            {t("Available To")}
          </label>
          <input
            type='datetime-local'
            value={availableTo || ""}
            onChange={e => setAvailableTo(e.target.value || null)}
            className='mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white'
          />
        </div>
        <SurveyCreatorComponent creator={creator} />

        <div className='flex justify-end mt-6'>
          <button
            className='px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded hover:bg-green-600'
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? t("Saving...")
              : mode === "create"
                ? t("Create Task")
                : t("Update Task")}
          </button>
        </div>
      </div>
    </>
  )
}
