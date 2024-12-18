import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default class CampaignController {
  static async getAllCampaigns() {
    return await prisma.campaign.findMany({
      where: { disabled: false },
      include: {
        subCampaigns: {
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

  static async getCampaignById(id: string) {
    return await prisma.campaign.findUnique({
      where: { id },
      include: {
        subCampaigns: {
          include: {
            tasks: true
          }
        },
        allowedUsers: true
      }
    })
  }

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
