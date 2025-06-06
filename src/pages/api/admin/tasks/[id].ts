import { NextApiRequest, NextApiResponse } from "next"
import TasksController from "@/controllers/admin/TasksController"
import { PrismaClient } from "@prisma/client"
import axios from "axios"

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  try {
    switch (req.method) {
      case "GET": {
        if (!id) {
          return res.status(400).json({ error: "Task ID is required" })
        }

        const task = await TasksController.getTaskById(id as string)
        return res.status(200).json(task)
      }

      case "PUT": {
        if (!id) {
          return res.status(400).json({ error: "Task ID is required" })
        }

        const updatedTaskBody = {
          title: req?.body?.title,
          description: req?.body?.description,
          type: req?.body?.type,
          taskData: req?.body?.taskData,
          responseLimit: req?.body?.responseLimit,
          responseLimitInterval: req?.body?.responseLimitInterval,
          availableFrom: req?.body?.availableFrom,
          availableTo: req?.body?.availableTo
        }

        if (
          updatedTaskBody?.responseLimit &&
          isNaN(updatedTaskBody?.responseLimit)
        ) {
          return res
            .status(400)
            .json({ error: "Response limit should be a number" })
        }

        if (
          updatedTaskBody?.responseLimitInterval &&
          isNaN(updatedTaskBody?.responseLimitInterval)
        ) {
          return res.status(400).json({
            error: "Response limit (minutes) interval should be a number"
          })
        }

        if (
          updatedTaskBody?.availableFrom &&
          isNaN(Date.parse(updatedTaskBody?.availableFrom))
        ) {
          return res
            .status(400)
            .json({ error: "Available from should be a valid date" })
        }

        if (
          updatedTaskBody?.availableTo &&
          isNaN(Date.parse(updatedTaskBody?.availableTo))
        ) {
          return res
            .status(400)
            .json({ error: "Available to should be a valid date" })
        }

        if (
          updatedTaskBody?.availableFrom &&
          updatedTaskBody?.availableTo &&
          updatedTaskBody?.availableFrom > updatedTaskBody?.availableTo
        ) {
          return res.status(400).json({
            error: "Available from date should be before available to date"
          })
        }

        const task = await TasksController.updateTask(
          id as string,
          updatedTaskBody
        )

        try {
          const campaignData = await TasksController.getCampaignDataByTaskId(
            id as string
          )
          const campaignId = campaignData?.id
          const gameId = campaignData?.gameId

          if (gameId) {
            const externalTaskId = `GREENCROWD_CAMPAIGNID_${campaignId}_TASK_${id}`
            const response = await axios.post(
              `${process.env.API_GAME_BASE_URL}/games/${gameId}/tasks`,
              {
                externalTaskId,
                strategyId: "default",
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
            task.message = `Task gamified successfully with ID: ${externalTaskId}`
          }
        } catch (error) {
          console.error("Error gamifying updated task:", error)
        }

        return res.status(200).json(task)
      }

      case "DELETE": {
        if (!id) {
          return res.status(400).json({ error: "Task ID is required" })
        }

        await prisma.task.delete({ where: { id: id as string } })
        return res.status(204).end()
      }

      default:
        return res.status(405).end()
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
