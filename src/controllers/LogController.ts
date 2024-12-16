import prisma from "../prismaClient";

export const getAllLog = async () => {
  return await prisma.log.findMany();
};

export const getLogById = async (id: string) => {
  return await prisma.log.findUnique({ where: { id } });
};

export const createLog = async (data: any) => {
  return await prisma.log.create({ data });
};

export const updateLog = async (id: string, data: any) => {
  return await prisma.log.update({ where: { id }, data });
};

export const deleteLog = async (id: string) => {
  return await prisma.log.delete({ where: { id } });
};