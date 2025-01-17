import { NextApiRequest, NextApiResponse } from "next"
import TaskController from "@/controllers/TaskController"
import UserTaskResponseController from "@/controllers/UserTaskResponseController"
import { validateKeycloakToken } from "@/utils/validateToken"
import UserController from "@/controllers/UserController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "POST":
      try {
        const body = req?.body
        const { taskResponse, position, taskId } = body

        if (!taskResponse) {
          return res.status(400).json({ error: "Task response is required" })
        }
        if (!position) {
          return res.status(400).json({ error: "Position is required" })
        }

        const taskData = await TaskController.getTaskByIdEvenDisabled(taskId)

        if (!taskData) {
          return res.status(404).json({ error: "Task not found" })
        }
        if (taskData?.isDisabled) {
          return res.status(403).json({ error: "Task is disabled" })
        }
        if (taskData?.pointOfInterest?.isDisabled) {
          return res
            .status(403)
            .json({ error: "Point of Interest is disabled" })
        }
        if (taskData?.pointOfInterest?.area?.isDisabled) {
          return res.status(403).json({ error: "Area is disabled" })
        }
        if (taskData?.pointOfInterest?.area?.campaign?.isDisabled) {
          return res.status(403).json({ error: "Campaign is disabled" })
        }

        // check if position is within the task's area
        const area = taskData.pointOfInterest.area
        const areaPolygon = area.polygon
        const isInsidePolygon = require("point-in-polygon")
        if (!isInsidePolygon(position, areaPolygon)) {
          return res
            .status(403)
            .json({ error: "You are not within the task's area" })
        }

        const { userId } = await validateKeycloakToken(req, res)

        let user = await UserController.getUserBySub(userId)

        if (!user) {
          return res.status(404).json({ error: "User not found" })
        }

        const taskResponses =
          await UserTaskResponseController.getResponsesOfUserByTaskId(
            taskId,
            user.id
          )

        if (
          taskData.responseLimit &&
          taskResponses.length >= taskData.responseLimit
        ) {
          return res.status(403).json({ error: "Response limit reached" })
        }
        if (taskData.responseLimitInterval) {
          const lastResponse = taskResponses[taskResponses.length - 1]
          if (lastResponse) {
            const lastResponseTime = new Date(lastResponse.createdAt)
            const currentTime = new Date()
            const diff =
              (currentTime.getTime() - lastResponseTime.getTime()) / 60000
            if (diff < taskData.responseLimitInterval) {
              return res
                .status(403)
                .json({ error: "Response limit interval reached" })
            }
          }
        }

        if (taskData.availableFrom) {
          const availableFrom = new Date(taskData.availableFrom)
          const currentTime = new Date()
          if (currentTime < availableFrom) {
            return res.status(403).json({ error: "Task is not available yet" })
          }
        }

        if (taskData.availableTo) {
          const availableTo = new Date(taskData.availableTo)
          const currentTime = new Date()
          if (currentTime > availableTo) {
            return res
              .status(403)
              .json({ error: "Task is no longer available" })
          }
        }

        const response = await UserTaskResponseController.createResponse(
          taskData,
          user,
          body
        )

        return res.status(200).json(body)
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }

    default:
      res.setHeader("Allow", ["POST"])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
