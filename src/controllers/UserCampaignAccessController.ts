import prisma from "../prismaClient"

export const getAllUserCampaignAccess = async () => {
  return await prisma.usercampaignaccess.findMany()
}

export const getUserCampaignAccessById = async (id: string) => {
  return await prisma.usercampaignaccess.findUnique({ where: { id } })
}

export const createUserCampaignAccess = async (data: any) => {
  return await prisma.usercampaignaccess.create({ data })
}

export const updateUserCampaignAccess = async (id: string, data: any) => {
  return await prisma.usercampaignaccess.update({ where: { id }, data })
}

export const deleteUserCampaignAccess = async (id: string) => {
  return await prisma.usercampaignaccess.delete({ where: { id } })
}
