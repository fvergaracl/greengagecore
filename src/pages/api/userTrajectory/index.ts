import { NextApiRequest, NextApiResponse } from "next"
import UserTrajectoryController from "@/controllers/UserTrajectoryController"
import { validateKeycloakToken } from "@/utils/validateToken" // Token validator
import { getUserBySub } from "@/controllers/UserController"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "POST": {
        const { lat, lng } = req.body
        const { userId } = await validateKeycloakToken(req)
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" })
        }
        const user = await getUserBySub(userId)
        console.log({ user })
        const trajectory = {
          userId: user.id,
          latitude: lat,
          longitude: lng
        }
        const createdCampaign =
          await UserTrajectoryController.createNewTrajectory(trajectory)
        return res.status(201).json(createdCampaign)
      }

      default:
        res.setHeader("Allow", ["POST"])
        return res
          .status(405)
          .end(`Method ${req.method} is not allowed on this endpoint.`)
    }
  } catch (err: any) {
    console.error("API Error:", err.message)
    res.status(500).json({ error: err.message })
  }
}
