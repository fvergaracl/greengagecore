import { NextApiRequest, NextApiResponse } from "next";
import { getAllCoordinate, createCoordinate } from "../../../controllers/CoordinateController";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      try {
        const data = await getAllCoordinate();
        res.status(200).json(data);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
      break;
    case "POST":
      try {
        const data = await createCoordinate(req.body);
        res.status(201).json(data);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
      break;
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}