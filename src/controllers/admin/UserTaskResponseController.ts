import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"

export default class UserTaskResponseController {
  @withPrismaDisconnect
  static async getAllUserResponses() {
    return await prisma.userTaskResponse.findMany({
      take: 100,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        user: {
          select: {
            id: true,
            alias: true
          }
        },
        task: {
          include: {
            pointOfInterest: {
              include: {
                area: {
                  include: {
                    campaign: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      where: {
        task: {
          isDisabled: false,
          pointOfInterest: {
            isDisabled: false,
            area: {
              isDisabled: false,
              campaign: {
                isDisabled: false
              }
            }
          }
        }
      }
    })
  }
}
