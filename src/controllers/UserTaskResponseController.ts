import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"

export default class UserTaskResponseController {
  @withPrismaDisconnect
  static async getResponsesOfUserByTaskId(userId: string, taskId: string) {
    return prisma.userTaskResponse.findMany({
      where: {
        userId,
        taskId
      }
    })
  }

  @withPrismaDisconnect
  static async createNewResponse(data: any) {
    return prisma.userTaskResponse.create({ data })
  }
}
