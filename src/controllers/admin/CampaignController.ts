import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"
import { Prisma } from "@prisma/client"

export default class CampaignController {
  @withPrismaDisconnect
  static async getAllCampaigns() {
    return await prisma.campaign.findMany({
      where: { disabled: false },
      include: {
        areas: {
          include: {
            pointOfInterests: {
              include: {
                tasks: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        },
        allowedUsers: {
          include: {
            user: {
              select: { id: true, sub: true }
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
  static async getCampaignNames() {
    return await prisma.campaign.findMany({
      select: {
        id: true,
        name: true
      }
    })
  }

  @withPrismaDisconnect
  static async getCampaignById(id: string) {
    return await prisma.campaign.findUnique({
      where: { id },
      include: {
        areas: {
          include: {
            pointOfInterests: {
              include: {
                tasks: {
                  select: { id: true }
                }
              }
            }
          }
        },
        allowedUsers: true
      }
    })
  }

  @withPrismaDisconnect
  static async createCampaign(data: Prisma.CampaignCreateInput) {
    const filteredData: Prisma.CampaignCreateInput = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value !== undefined ? value : null
      ])
    ) as Prisma.CampaignCreateInput
    return await prisma.campaign.create({
      data: filteredData
    })
  }

  @withPrismaDisconnect
  static async updateCampaign(id: string, data: any) {
    const filteredData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value !== undefined ? value : null
      ])
    )

    return await prisma.campaign.update({
      where: { id },
      data: filteredData
    })
  }
}
