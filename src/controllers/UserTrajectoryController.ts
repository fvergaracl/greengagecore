import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"
export default class UserTrajectoryController {
  @withPrismaDisconnect
  static async createNewTrajectory(data: any) {
    return prisma.userTrajectory.create({ data })
  }
}
