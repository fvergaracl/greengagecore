import prisma from "../prismaClient";

export const getAllSubCampaign = async () => {
  return await prisma.subcampaign.findMany();
};

export const getSubCampaignById = async (id: string) => {
  return await prisma.subcampaign.findUnique({ where: { id } });
};

export const createSubCampaign = async (data: any) => {
  return await prisma.subcampaign.create({ data });
};

export const updateSubCampaign = async (id: string, data: any) => {
  return await prisma.subcampaign.update({ where: { id }, data });
};

export const deleteSubCampaign = async (id: string) => {
  return await prisma.subcampaign.delete({ where: { id } });
};