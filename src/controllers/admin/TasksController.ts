import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default class TaskController {
  static async getAllTasks() {
    return await prisma.task.findMany({
      include: {
        pointOfInterest: {
          select: { id: true, name: true }
        }
      }
    })
  }

  static async getTaskById(id: string) {
    return await prisma.task.findUnique({
      where: { id },
      include: {
        pointOfInterest: {
          select: { id: true, name: true }
        }
      }
    })
  }

  static async getAllTasksByPOI(pointOfInterestId: string) {
    return await prisma.task.findMany({
      where: { pointOfInterestId },
      include: {
        pointOfInterest: {
          select: { id: true, name: true }
        }
      }
    })
  }

  static async createTask(data: any) {
    return await prisma.task.create({
      data
    })
  }

  static async updateTask(id: string, data: any) {
    return await prisma.task.update({
      where: { id },
      data
    })
  }

  static async deleteTask(id: string) {
    return await prisma.task.delete({
      where: { id }
    })
  }

 
}
