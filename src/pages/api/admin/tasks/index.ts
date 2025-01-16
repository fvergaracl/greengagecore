import { NextApiRequest, NextApiResponse } from "next"
import TasksController from "@/controllers/admin/TasksController"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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

          if (
            newTaskBody?.availableFrom &&
            isNaN(Date.parse(newTaskBody?.availableFrom))
          ) {
            return res
              .status(400)
              .json({ error: "Available from should be a valid date" })
          }

          if (
            newTaskBody?.availableTo &&
            isNaN(Date.parse(newTaskBody?.availableTo))
          ) {
            return res
              .status(400)
              .json({ error: "Available to should be a valid date" })
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
    await prisma.$disconnect()
  }
}
