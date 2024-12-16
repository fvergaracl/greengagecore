import prisma from "../prismaClient";

export const getAllGeoLocation = async () => {
  return await prisma.geolocation.findMany();
};

export const getGeoLocationById = async (id: string) => {
  return await prisma.geolocation.findUnique({ where: { id } });
};

export const createGeoLocation = async (data: any) => {
  return await prisma.geolocation.create({ data });
};

export const updateGeoLocation = async (id: string, data: any) => {
  return await prisma.geolocation.update({ where: { id }, data });
};

export const deleteGeoLocation = async (id: string) => {
  return await prisma.geolocation.delete({ where: { id } });
};