import prisma from "../prismaClient";

export const getAllDataEntry = async () => {
  return await prisma.dataentry.findMany();
};

export const getDataEntryById = async (id: string) => {
  return await prisma.dataentry.findUnique({ where: { id } });
};

export const createDataEntry = async (data: any) => {
  return await prisma.dataentry.create({ data });
};

export const updateDataEntry = async (id: string, data: any) => {
  return await prisma.dataentry.update({ where: { id }, data });
};

export const deleteDataEntry = async (id: string) => {
  return await prisma.dataentry.delete({ where: { id } });
};