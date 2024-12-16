import prisma from "../prismaClient";

export const getAllCoordinate = async () => {
  return await prisma.coordinate.findMany();
};

export const getCoordinateById = async (id: string) => {
  return await prisma.coordinate.findUnique({ where: { id } });
};

export const createCoordinate = async (data: any) => {
  return await prisma.coordinate.create({ data });
};

export const updateCoordinate = async (id: string, data: any) => {
  return await prisma.coordinate.update({ where: { id }, data });
};

export const deleteCoordinate = async (id: string) => {
  return await prisma.coordinate.delete({ where: { id } });
};