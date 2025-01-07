import React, { useState, useEffect } from "react"
import DashboardLayout from "../../../components/DashboardLayout"
import { useRouter } from "next/router"
import { FiArrowLeft } from "react-icons/fi"
import { SurveyModel } from "survey-core"
import { Survey } from "survey-react-ui"
import "survey-core/defaultV2.min.css"

export default function Task() {
  const router = useRouter()
  const { id } = router.query
  const [task, setTask] = useState<any>(null)

  useEffect(() => {
    if (id) {
      fetch(`/api/task/${id}`)
        .then(res => res.json())
        .then(data => {
          setTask(data)
        })
        .catch(error => {
          console.error("Error fetching task data:", error)
        })
    }
  }, [id])

  const goBack = () => {
    router.back()
  }

  const handleSurveyCompletion = (surveyData: any) => {
    console.log("Survey completed:", surveyData)
    alert("Thank you for completing the task!")
  }

  console.log({ task })

  return (
    <DashboardLayout>
      <div className='p-4'>
        <button
          onClick={goBack}
          className='flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4'
        >
          <FiArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className='bg-white shadow-md rounded-lg p-6'>
          {task ? (
            <>
              <h1 className='text-2xl font-bold text-gray-800 mb-4'>
                {task.title}
              </h1>
              <p className='text-gray-700 mb-6'>{task.description}</p>

              {task.type === "survey" && task.taskData ? (
                <div>
                  <Survey
                    model={
                      new SurveyModel({
                        ...task.taskData,
                        completeText: "Submit"
                      })
                    }
                    onComplete={survey => handleSurveyCompletion(survey.data)} // Manejar la acción al completar
                    renderCompleted={data => {
                      return (
                        <div className='bg-green-100 text-green-800 p-4 rounded-lg'>
                          <p>Thank you for completing the survey!</p>
                          <pre>{JSON.stringify(data, null, 2)}</pre>
                        </div>
                      )
                    }}
                  />
                </div>
              ) : (
                <p className='text-gray-500'>
                  This task type is not supported.
                </p>
              )}
            </>
          ) : (
            <p className='text-gray-500'>Loading task data...</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
