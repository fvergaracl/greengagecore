import { NextApiRequest, NextApiResponse } from "next"
import TasksController from "@/controllers/admin/TasksController"
import axios from "axios"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET": {
        try {
          const tasks = await TasksController.getAllTasks()
          return res.status(200).json(tasks)
        } catch (error) {
          console.error("Error fetching tasks:", error)
          return res.status(500).json({ error: "Internal Server Error" })
        }
      }

      case "POST": {
        try {
          const newTaskBody = {
            ...req.body,
            pointOfInterestId: req.body.poiId
          }
          delete newTaskBody.poiId
          if (newTaskBody?.responseLimit && isNaN(newTaskBody?.responseLimit)) {
            return res
              .status(400)
              .json({ error: "Response limit should be a number" })
          }

          if (
            newTaskBody?.responseLimitInterval &&
            isNaN(newTaskBody?.responseLimitInterval)
          ) {
            return res.status(400).json({
              error: "Response limit (minutes) interval should be a number"
            })
          }

          if (newTaskBody?.availableFrom) {
            if (isNaN(Date.parse(newTaskBody?.availableFrom)))
              return res
                .status(400)
                .json({ error: "Available from should be a valid date" })

            newTaskBody.availableFrom = new Date(
              newTaskBody?.availableFrom
            ).toISOString()
          }

          if (newTaskBody?.availableTo) {
            if (isNaN(Date.parse(newTaskBody?.availableTo)))
              return res
                .status(400)
                .json({ error: "Available to should be a valid date" })
            newTaskBody.availableTo = new Date(
              newTaskBody?.availableTo
            ).toISOString()
          }

          if (
            newTaskBody?.availableFrom &&
            newTaskBody?.availableTo &&
            newTaskBody?.availableFrom > newTaskBody?.availableTo
          ) {
            return res.status(400).json({
              error: "Available from date should be before available to date"
            })
          }
          const newTask = await TasksController.createTask(newTaskBody)

          const campaignData = await TasksController.getCampaignDataByTaskId(
            newTask.id
          )
          const campaignId = campaignData?.id
          const gameId = campaignData?.gameId

          if (gameId) {
            try {
              const gameTasksRes = await axios.get(
                `${process.env.API_GAME_BASE_URL}/games/${gameId}/tasks/${newTask.id}`,
                {
                  headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": process.env.API_GAME_APIKEY!
                  }
                }
              )
              if (gameTasksRes.status === 200) {
                return res.status(200).json(newTask)
              }
            } catch (error) {
              console.error("Error checking game tasks:", error)
            }

            const externalTaskId = `GREENCROWD_CAMPAIGNID_${campaignId}_TASK_${newTask.id}`

            await axios.post(
              `${process.env.API_GAME_BASE_URL}/games/${gameId}/tasks`,
              {
                externalTaskId,
                params: [
                  {
                    key: "variable_bonus_points",
                    value: 10
                  }
                ]
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  "X-API-Key": process.env.API_GAME_APIKEY!
                }
              }
            )
            newTask.message = `Task created successfully in the ID ${externalTaskId}.`
          }

          return res.status(201).json(newTask)
        } catch (error) {
          console.error("Error creating task:", error)
          return res.status(500).json({ error: "Internal Server Error" })
        }
      }

      default: {
        res.setHeader("Allow", ["GET", "POST"])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
      }
    }
  } catch (error) {
    console.error("API Error:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  } finally {
  }
}
