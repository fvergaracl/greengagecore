import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../prismaClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      await getAll(res);
      break;
    case "POST":
      await create(req, res);
      break;
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getAll(res: NextApiResponse) {
  try {
    const data = await prisma.geolocation.findMany();
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await prisma.geolocation.create({ data: req.body });
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}