import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../prismaClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      await getById(req, res);
      break;
    case "PUT":
      await update(req, res);
      break;
    case "DELETE":
      await remove(req, res);
      break;
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getById(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const data = await prisma.user.findUnique({ where: { id: String(id) } });
    if (!data) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const data = await prisma.user.update({
      where: { id: String(id) },
      data: req.body,
    });
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    await prisma.user.delete({ where: { id: String(id) } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}