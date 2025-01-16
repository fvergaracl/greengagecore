import type { NextApiRequest, NextApiResponse } from "next"
import UserTaskResponseController from "@/controllers/admin/UserTaskResponseController"


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET": {
        const campaigns = await UserTaskResponseController.getAllUserResponses()
        return res.status(200).json(campaigns)
      }

      default: {
        res.setHeader("Allow", ["GET"])
        return res
          .status(405)
          .json({ error: `Method ${req.method} Not Allowed` })
      }
    }
  } catch (error) {
    console.error("API Error:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}
