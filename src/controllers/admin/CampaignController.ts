import { prisma, withPrismaDisconnect } from "@/utils/withPrismaDisconnect"

export default class CampaignController {
  @withPrismaDisconnect
  static async getAllCampaigns() {
    return await prisma.campaign.findMany({
      where: { disabled: false },
      include: {
        areas: {
          include: {
            tasks: {
              select: { id: true }
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
        created_at: "desc"
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
            tasks: true
          }
        },
        allowedUsers: true
      }
    })
  }

  @withPrismaDisconnect
  static async createCampaign(data: any) {
    return await prisma.campaign.create({
      data: {
        name: data?.name,
        description: data?.description,
        isOpen: data?.isOpen,
        deadline: data?.deadline && new Date(data.deadline),
        type: data?.type,
        gameId: data?.gameId
      }
    })
  }

  @withPrismaDisconnect
  static async updateCampaign(id: string, data: any) {
    return await prisma.campaign.update({
      where: { id },
      data: {
        name: data?.name,
        description: data?.description,
        isOpen: data?.isOpen,
        deadline: data?.deadline && new Date(data.deadline),
        type: data?.type,
        gameId: data?.gameId
      }
    })
  }
}
