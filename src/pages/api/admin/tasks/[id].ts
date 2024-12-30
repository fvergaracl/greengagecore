import { NextApiRequest, NextApiResponse } from "next"
import TasksController from "@/controllers/admin/TasksController"
import { PrismaClient } from "@prisma/client"

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

        const task = await TasksController.updateTask(id as string, req.body)
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
