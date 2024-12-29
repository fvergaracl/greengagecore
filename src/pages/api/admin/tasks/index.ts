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
