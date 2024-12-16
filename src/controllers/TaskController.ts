import prisma from "../prismaClient";

export const getAllTask = async () => {
  return await prisma.task.findMany();
};

export const getTaskById = async (id: string) => {
  return await prisma.task.findUnique({ where: { id } });
};

export const createTask = async (data: any) => {
  return await prisma.task.create({ data });
};

export const updateTask = async (id: string, data: any) => {
  return await prisma.task.update({ where: { id }, data });
};

export const deleteTask = async (id: string) => {
  return await prisma.task.delete({ where: { id } });
};