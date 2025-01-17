import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"
import { Prisma } from "@prisma/client"

export default class TaskController {
  @withPrismaDisconnect
  static async getAllTasks() {
    try {
      return await prisma.task.findMany({
        where: { isDisabled: false },
        include: {
          pointOfInterest: {
            where: { isDisabled: false },
            include: {
              area: {
                where: { isDisabled: false },
                include: {
                  campaign: {
                    where: { isDisabled: false }
                  }
                }
              }
            }
          }
        }
      })
    } catch (error) {
      console.error("Error fetching tasks:", error)
      throw new Error("Failed to fetch tasks")
    }
  }

  @withPrismaDisconnect
  static async getTaskById(id: string) {
    try {
      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          pointOfInterest: {
            include: {
              area: {
                include: {
                  campaign: true
                }
              }
            }
          }
        }
      })

      if (
        !task ||
        task.isDisabled ||
        task.pointOfInterest?.isDisabled ||
        task.pointOfInterest?.area?.isDisabled ||
        task.pointOfInterest?.area?.campaign?.isDisabled
      ) {
        return null
      }

      return task
    } catch (error) {
      console.error("Error fetching task by ID:", error)
      throw new Error("Failed to fetch task")
    }
  }
  @withPrismaDisconnect
  static async getTaskByIdEvenDisabled(id: string) {
    try {
      if (!id) {
        throw new Error("ID is required to fetch a task.")
      }

      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          pointOfInterest: {
            include: {
              area: {
                include: {
                  campaign: true
                }
              }
            }
          }
        }
      })

      return task
    } catch (error) {
      console.error("Error fetching task by ID:", error)
      throw new Error("Failed to fetch task")
    }
  }

  @withPrismaDisconnect
  static async updateTask(data: Prisma.TaskCreateInput) {
    try {
      return await prisma.task.update({
        where: { id: data.id },
        data
      })
    } catch (error) {
      console.error("Error updating task:", error)
      throw new Error("Failed to update task")
    }
  }

  @withPrismaDisconnect
  static async deleteTask(id: string) {
    try {
      return await prisma.task.update({
        where: { id },
        data: { isDisabled: true }
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      throw new Error("Failed to delete task")
    }
  }
}
