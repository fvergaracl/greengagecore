import React, { useState, useEffect, useRef } from "react"
import DistanceIndicator from "@/components/Common/Map/DistanceIndicator"
import DashboardLayout from "@/components/DashboardLayout"
import GoBack from "@/components/Admin/GoBack"
import { useTranslation } from "@/hooks/useTranslation"
import { useDashboard } from "@/context/DashboardContext"
import { useRouter } from "next/router"
import { SurveyModel } from "survey-core"
import { Survey } from "survey-react-ui"
import axios from "axios"
import "survey-core/defaultV2.min.css"
import Swal from "sweetalert2"
import { getApiBaseUrl, getApiGameBaseUrl } from "@/config/api"
import { logEvent } from "@/utils/logger"
import Lottie from "lottie-react"
import loading_1 from "@/lotties/loading_1.json"
import loading_2 from "@/lotties/loading_2.json"
import loading_3 from "@/lotties/loading_3.json"
import loading_4 from "@/lotties/loading_4.json"
import loading_5 from "@/lotties/loading_5.json"
import loading_6 from "@/lotties/loading_6.json"
import sent_without_gamification from "@/lotties/sent_without_gamification.json"
import downloading_task from "@/lotties/downloading_task.json"
import points_reward from "@/lotties/points_reward.json"
// wip acá
const decodeToken = (token: string): { roles?: string[] } | null => {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    )
    return payload
  } catch {
    console.error("Invalid token format")
    return null
  }
}

const TaskWrapperComponent = ({
  taskData,
  t,
  isInside,
  onComplete,
  setUserDeclareInside
}: {
  taskData: any
  t: any
  isInside: boolean
  onComplete: (survey: any, setIsSubmitted: (value: boolean) => void) => void
  setUserDeclareInside: (value: boolean) => void
}) => {
  const surveyRef = useRef<SurveyModel | null>(null)
  const forceCompleteRef = useRef(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  if (!surveyRef.current && taskData) {
    surveyRef.current = new SurveyModel({
      ...taskData,
      completeText: t("Submit"),
      showCompletedPage: false
    })
  }

  const form = surveyRef.current

  useEffect(() => {
    if (!form) return

    const handleCompleting = async (sender: any, options: any) => {
      if (!isInside && !forceCompleteRef.current) {
        options.allowComplete = false

        const result = await Swal.fire({
          title: t("Are you inside the point of interest?"),
          text: t("You seem to be outside the POI. Please confirm."),
          icon: "question",
          showCancelButton: true,
          confirmButtonText: t("Yes, I am inside"),
          cancelButtonText: t("No, cancel submission")
        })

        if (result.isConfirmed) {
          setUserDeclareInside(true)
          forceCompleteRef.current = true
          form.doComplete()
        }
      }
    }

    const compressImage = (file: File, quality = 0.7): Promise<string> => {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = e => {
          const img = new Image()
          img.src = e.target?.result as string
          img.onload = () => {
            const canvas = document.createElement("canvas")
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext("2d")
            ctx?.drawImage(img, 0, 0)
            const compressedDataUrl = canvas.toDataURL("image/jpeg", quality)
            resolve(compressedDataUrl)
          }
        }
      })
    }

    const handleValueChanging = async (sender: any, options: any) => {
      const question = sender.getQuestionByName(options.name)
      if (
        (question?.getType() === "file" || question?.getType() === "image") &&
        options.newValue?.[0] instanceof File
      ) {
        const file = options.newValue[0]
        const compressed = await compressImage(file, 0.6)
        options.newValue = [compressed]
      }
    }

    form.onCompleting.add(handleCompleting)
    form.onValueChanging.add(handleValueChanging)

    return () => {
      form.onCompleting.remove(handleCompleting)
      form.onValueChanging.remove(handleValueChanging)
    }
  }, [form, isInside, t])

  return (
    <div>
      {isSubmitted ? (
        <div className='bg-green-100 text-green-800 p-4 rounded-lg'>
          <p>{t("Thank you for completing the task!")}</p>
        </div>
      ) : (
        <Survey
          model={form}
          onComplete={(survey: any) => {
            onComplete(survey, setIsSubmitted)
          }}
        />
      )}
    </div>
  )
}

TaskWrapperComponent.displayName = "TaskWrapper"

const TaskWrapper = React.memo(
  TaskWrapperComponent,
  (prevProps, nextProps) => prevProps.taskData === nextProps.taskData
)

export default function Task() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = router.query
  const { position, selectedCampaign } = useDashboard()
  const [task, setTask] = useState<any>(null)
  const [isInside, setIsInside] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sendingResponse, setSendingResponse] = useState(false)
  const [responseSent, setResponseSent] = useState(false)
  const [myActivityInTask, setMyActivityInTask] = useState<any>(null)
  const [userDeclareInside, setUserDeclareInside] = useState(false)

  const localStorageAccesstoken = localStorage.getItem("access_token")
  const localStorageGamificationData = localStorage.getItem(
    `gamificationData_${selectedCampaign?.id}`
  )
  const localStorageLastFetchGamificationData = localStorage.getItem(
    `lastFetchGamificationData_${selectedCampaign?.id}`
  )
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorageAccesstoken
  )
  const [gamificationData, setGamificationData] = useState<any>(
    localStorageGamificationData &&
      !JSON.parse(localStorageGamificationData)?.details
      ? JSON.parse(localStorageGamificationData)
      : null
  )
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)
  const [lastFetchGamificationData, setLastFetchGamificationData] = useState(
    localStorageLastFetchGamificationData
      ? new Date(localStorageLastFetchGamificationData)
      : null
  )
  const loadingArray = [
    loading_1,
    loading_2,
    loading_3,
    loading_4,
    loading_5,
    loading_6
  ]
  const randomLoadingUploading = useRef(
    Math.floor(Math.random() * loadingArray.length)
  )

  // useEffect src/pages/api/task/myActivityCounts.ts
  useEffect(() => {
    const fetchMyActivityInTask = async () => {
      try {
        const response = await axios.get(
          `${getApiBaseUrl()}/task/myActivityCounts?taskId=${id}`,
          {
            withCredentials: true
          }
        )
        setMyActivityInTask(response.data)
      } catch (error) {
        console.error("Error fetching my activity in task:", error)
      }
    }
    if (!myActivityInTask && id) {
      fetchMyActivityInTask()
    }
  }, [id])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!responseSent) {
        event.preventDefault()
        event.returnValue = ""
      }
    }

    const handleRouteChange = (url: string) => {
      if (!responseSent) {
        router.events.off("routeChangeStart", handleRouteChange)

        Swal.fire({
          title: t("Are you sure you want to leave?"),
          text: t("You have not completed the task yet."),
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: t("Leave"),
          cancelButtonText: t("Stay")
        }).then(result => {
          if (result.isConfirmed) {
            window.removeEventListener("beforeunload", handleBeforeUnload)
            router.events.off("routeChangeStart", handleRouteChange)
            router.push(url)
          } else {
            router.events.on("routeChangeStart", handleRouteChange)
          }
        })

        throw "Route change cancelled"
      }
    }

    if (!responseSent) {
      window.addEventListener("beforeunload", handleBeforeUnload)
      router.events.on("routeChangeStart", handleRouteChange)
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      router.events.off("routeChangeStart", handleRouteChange)
    }
  }, [responseSent])

  useEffect(() => {
    if (!accessToken) return
    const fetchGamificationData = async () => {
      const gameId = task?.pointOfInterest?.area?.campaign?.gameId
      const decodedToken = decodeToken(accessToken)
      const res = await fetch(
        `${getApiGameBaseUrl()}/games/${gameId}/users/${decodedToken?.sub}/points/simulated`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )
      const resJson = await res.json()
      setGamificationData(resJson)
      logEvent(
        "USER_FETCHED_GAMIFICATION_DATA_FROM_TASK",
        `User fetched gamification data for campaign (Taskid): ${id}`,
        {
          gamificationData: resJson,
          gameId,
          userId: decodedToken?.sub,
          accessToken
        }
      )
      if (resJson?.detail) {
        logEvent(
          "USER_FETCHED_GAMIFICATION_DATA_FROM_TASK_ERROR",
          `User fetched gamification data for task: ${id} with error`,
          {
            gamificationData: resJson,
            gameId,
            userId: decodedToken?.sub,
            accessToken
          }
        )
        console.error("Error fetching gamification data", resJson.detail)
        await new Promise(resolve => setTimeout(resolve, 1000))
        fetchGamificationData()
        return
      }
      localStorage.setItem(
        `gamificationData_${selectedCampaign?.id}`,
        JSON.stringify(resJson)
      )
      localStorage.setItem(
        `lastFetchGamificationData_${selectedCampaign?.id}`,
        new Date().toString()
      )
      setLastFetchGamificationData(new Date())
    }
    const fetchGamificationDataInterval = 5 * 60 * 1000

    if (
      (!lastFetchGamificationData ||
        new Date().getTime() - lastFetchGamificationData.getTime() >
          fetchGamificationDataInterval) &&
      task
    ) {
      fetchGamificationData()
    }

    const interval = setInterval(() => {
      fetchGamificationData()
    }, fetchGamificationDataInterval)

    return () => clearInterval(interval)
  }, [accessToken])

  useEffect(() => {
    let templastFetchGamificationData = localStorage.getItem(
      `lastFetchGamificationData_${selectedCampaign?.id}`
    )
    setLastFetchGamificationData(
      templastFetchGamificationData
        ? new Date(templastFetchGamificationData)
        : null
    )
    const fetchTask = async () => {
      try {
        const { data } = await axios.get(`${getApiBaseUrl()}/task/${id}`)
        setTask(data)
      } catch (error) {
        console.error("Error fetching task data:", error)
      }
      setLoading(false)
    }
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/auth/token", {
          method: "GET",
          credentials: "include"
        })
        if (!response.ok) throw new Error("Failed to fetch token")

        const { access_token } = await response.json()
        setAccessToken(access_token)
        localStorage.setItem("access_token", access_token)
      } catch (error) {
        console.error("Error fetching token:", error)
      }
    }
    if (id) {
      fetchTask()
      fetchToken()
    }
  }, [id])

  const handleSurveyCompletion = async (
    survey: SurveyModel,
    setIsSubmitted: (value: boolean) => void
  ) => {
    setSendingResponse(true)
    logEvent("TASK_SENDING_RESPONSE", "Task sending response", {
      taskResponse: survey.data,
      taskId: id,
      position,
      userDeclareInside
    })
    await axios
      .post(`${getApiBaseUrl()}/task/${id}/response`, {
        taskResponse: survey.data,
        taskId: id,
        position,
        userDeclareInside
      })
      .then(async () => {
        logEvent("TASK_COMPLETED_SUCCESS", "Task completed", {
          taskResponse: survey.data,
          taskId: id,
          position
        })
        const decodedToken = decodeToken(accessToken)
        // WIP CAMPAIGN + TASK ID
        //             const externalTaskId = `GREENCROWD_CAMPAIGNID_${campaignId}_TASK_${id}`

        const externalTaskId = `GREENCROWD_CAMPAIGNID_${task.campaignId}_TASK_${task.id}`
        if (task?.pointOfInterest?.area?.campaign?.gameId) {
          await axios
            .post(
              `${getApiGameBaseUrl()}/games/${task?.gameId}/tasks/${externalTaskId}/points`,
              {
                externalUserId: decodedToken?.sub,
                data: gamificationData,
                isSimulated: true
              },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`
                }
              }
            )
            .then(res => {
              logEvent(
                "TASK_COMPLETED_GAMIFICATION",
                "Task completed with gamification",
                {
                  taskResponse: survey.data,
                  gamificationData,
                  taskId: id,
                  position
                }
              )
              localStorage.removeItem(
                `gamificationData_${selectedCampaign?.id}`
              )
              localStorage.removeItem(
                `lastFetchGamificationData_${selectedCampaign?.id}`
              )

              setPointsEarned(res?.data?.points)

              setResponseSent(true)
            })
            .catch(error => {
              console.error("Error adding points:", error)
              logEvent(
                "TASK_COMPLETED_ERROR_GAMIFICATION",
                "Task completed with error",
                {
                  taskResponse: survey.data,
                  gamificationData,
                  taskId: id,
                  position,
                  error
                }
              )
              Swal.fire(
                t("Error!"),
                t(error?.response?.data?.error || t("An error occurred")),
                "error"
              )
            })
        } else {
          setResponseSent(true)
          setPointsEarned(-1)
        }

        Swal.fire(t("Success!"), t("Task completed successfully!"), "success")
        setSendingResponse(false)

        setIsSubmitted(true)
      })
      .catch(error => {
        setSendingResponse(false)
        logEvent("TASK_COMPLETED_ERROR", "Task completed with error", {
          taskResponse: survey.data,
          taskId: id,
          position,
          error
        })
        console.error("Error completing task:", error)
        Swal.fire(
          t("Error!"),
          t(error?.response?.data?.error || t("An error occurred")),
          "error"
        )
      })
  }

  if (pointsEarned === -1 && responseSent) {
    return (
      <DashboardLayout>
        <div className='h-screen flex flex-col items-center justify-center p-4'>
          <div className='bg-white shadow-md rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4'>
            <Lottie
              animationData={sent_without_gamification}
              loop={false}
              className='flex w-full justify-center min-w-[300px] max-w-[400px]'
            />
            <h1 className='text-gray-600 text-lg font-medium'>
              {t("Task completed successfully!")}
              <span className='text-black-600 text-xl pt-2 '>
                <br />
                {t("You have already completed this task")}
              </span>
            </h1>
            <GoBack
              data-cy='go-back-task'
              className='text-blue-600 cursor-pointer mt-8 mb-4 inline-block'
            />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (responseSent) {
    return (
      <DashboardLayout>
        <div className='h-screen flex flex-col items-center justify-center p-4'>
          <div className='bg-white shadow-md rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4'>
            <Lottie
              animationData={points_reward}
              loop={false}
              className='flex w-full justify-center min-w-[300px] max-w-[400px]'
            />
            <h1 className='text-gray-600 text-lg font-medium'>
              {t("Task completed successfully!! ")}
              {pointsEarned && (pointsEarned > 0 || pointsEarned !== "0") && (
                <span className='text-black-600 text-xl pt-2 '>
                  <br />
                  {t("You have earned")}{" "}
                  <strong
                    style={{
                      color: "green",
                      textDecoration: "underline"
                    }}
                  >
                    {pointsEarned}
                  </strong>{" "}
                  {t("points")}
                </span>
              )}
            </h1>
            <GoBack
              data-cy='go-back-task'
              className='text-blue-600 cursor-pointer mt-8 mb-4 inline-block'
            />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className='h-screen flex flex-col items-center justify-center p-4'>
          <div className='bg-white shadow-md rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4 w-full'>
            <Lottie animationData={downloading_task} className='w-full' />
            <h1 className='text-gray-600 text-lg font-medium'>
              {t("Loading task...")}
            </h1>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (sendingResponse) {
    return (
      <DashboardLayout>
        <div className='h-screen flex flex-col items-center justify-center p-4'>
          <div className='bg-white shadow-md rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4'>
            <Lottie
              animationData={loadingArray[randomLoadingUploading.current]}
              className='w-full'
            />
            <h1 className='text-gray-600 text-lg font-medium'>
              {t("Sending response...")}
            </h1>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className='pt-4'>
        {task?.pointOfInterest && position ? (
          <DistanceIndicator
            poi={task.pointOfInterest}
            onRadiusChange={isInsidePOI => {
              setIsInside(!!isInsidePOI)
            }}
          />
        ) : null}
        <div className='bg-white shadow-md rounded-lg'>
          <GoBack
            data-cy='go-back-task'
            className='text-blue-600 cursor-pointer mt-8 mb-4 inline-block pl-6 pt-4'
          />

          {task ? (
            <>
              <h1 className='text-2xl font-bold text-gray-800 mb-4  pl-6'>
                {task.title}
              </h1>
              <p className='text-gray-700 mb-6'>{task.description}</p>

              {task.taskData ? (
                <div>
                  <TaskWrapper
                    taskData={task.taskData}
                    t={t}
                    isInside={isInside}
                    onComplete={handleSurveyCompletion}
                    setUserDeclareInside={setUserDeclareInside}
                  />
                </div>
              ) : (
                <p className='text-gray-500'>
                  {t(
                    "This task type is not supported. Please contact the administrator."
                  )}
                </p>
              )}
            </>
          ) : (
            <p className='text-gray-500'>
              {t("Task not found. Please contact the administrator.")}
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
