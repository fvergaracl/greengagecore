import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"
export default class UserTrajectoryController {
  @withPrismaDisconnect
  static async createNewTrajectory(data: any) {
    console.log("---------------------------------data")
    console.log(data)
    return prisma.userTrajectory.create({ data })
  }
}
