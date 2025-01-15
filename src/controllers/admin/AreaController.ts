import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"

export default class AreaController {
  @withPrismaDisconnect
  static async getAllAreas() {
    return await prisma.area.findMany({
      where: { isDisabled: false },
      include: {
        pointOfInterests: {
          include: {
            tasks: {
              select: { id: true }
            }
          }
        },

        campaign: {
          select: {
            id: true,
            name: true,
            allowedUsers: {
              include: {
                user: {
                  select: { id: true, sub: true }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  }
  @withPrismaDisconnect
  static async getAreaNames() {
    try {
      const areas = await prisma.area.findMany({
        select: {
          name: true
        }
      })

      return areas.map(area => area.name)
    } catch (error) {
      console.error("Error in getAreaNames:", error)
      throw new Error("Failed to fetch areas names")
    }
  }
  @withPrismaDisconnect
  static async getAreaById(id: string) {
    return await prisma.area.findUnique({
      where: { id },
      include: {
        pointOfInterests: {
          include: {
            tasks: true
          }
        },
        campaign: {
          select: { id: true, name: true }
        }
      }
    })
  }
  @withPrismaDisconnect
  static async createArea(data: any) {
    return await prisma.area.create({
      data: {
        name: data?.name,
        description: data?.description,
        isDisabled: false,
        campaignId: data?.campaignId,
        polygon: data?.polygon
      }
    })
  }

  @withPrismaDisconnect
  static async updateArea(id: string, data: any) {
    return await prisma.area.update({
      where: { id },
      data: {
        name: data?.name,
        description: data?.description,
        isDisabled: data?.isDisabled,
        polygon: data?.polygon
      }
    })
  }

  @withPrismaDisconnect
  static async deleteArea(id: string) {
    const areas = await prisma.area.update({
      where: { id },
      data: { isDisabled: true }
    })
    const pois = await prisma.pointOfInterest.updateMany({
      where: { areaId: id },
      data: { isDisabled: true }
    })
    const tasks = await prisma.task.updateMany({
      where: { pointOfInterest: { areaId: id } },
      data: { isDisabled: true }
    })

    return { areas, pois, tasks }
  }
}
