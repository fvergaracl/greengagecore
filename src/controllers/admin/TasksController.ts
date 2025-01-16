import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"

export default class TaskController {
  @withPrismaDisconnect
  static async getAllTasks() {
    return await prisma.task.findMany({
      where: {
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
      },
      include: {
        pointOfInterest: {
          select: {
            id: true,
            name: true,
            area: {
              select: {
                id: true,
                name: true,
                campaign: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        UserTaskResponses: {
          select: {
            id: true,
            data: true,
            latitude: true,
            longitude: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                alias: true
              }
            }
          }
        }
      }
    })
  }

  @withPrismaDisconnect
  static async getTaskById(id: string) {
    return await prisma.task.findUnique({
      where: {
        id,
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
      },
      include: {
        pointOfInterest: {
          select: {
            id: true,
            name: true,
            area: {
              select: {
                id: true,
                name: true,
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
    })
  }
  @withPrismaDisconnect
  static async getAllTasksByPOI(pointOfInterestId: string) {
    return await prisma.task.findMany({
      where: {
        pointOfInterestId,
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
      },
      include: {
        pointOfInterest: {
          select: { id: true, name: true }
        }
      }
    })
  }
  @withPrismaDisconnect
  static async createTask(data: any) {
    return await prisma.task.create({
      data
    })
  }
  @withPrismaDisconnect
  static async updateTask(id: string, data: any) {
    return await prisma.task.update({
      where: { id },
      data
    })
  }
  @withPrismaDisconnect
  static async deleteTask(id: string) {
    return await prisma.task.delete({
      where: { id }
    })
  }
}
