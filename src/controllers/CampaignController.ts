import prisma from "../prismaClient"

export const getAllCampaign = async () => {
  return await prisma.campaign.findMany()
}

export const getCampaignById = async (id: string) => {
  return await prisma.campaign.findUnique({ where: { id } })
}

export const createCampaign = async (data: any) => {
  return await prisma.campaign.create({ data })
}

export const updateCampaign = async (id: string, data: any) => {
  return await prisma.campaign.update({ where: { id }, data })
}

export const deleteCampaign = async (id: string) => {
  return await prisma.campaign.delete({ where: { id } })
}
