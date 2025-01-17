import { NextApiRequest, NextApiResponse } from "next"
import UserController from "@/controllers/UserController"
// ***************************************************************************** WIP

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      try {
        const { id } = req.query
        const data = await UserController.getUserById(String(id))
        if (!data) {
          return res.status(404).json({ error: "User not found" })
        } else {
          return res.status(200).json(data)
        }
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }
    case "PUT":
      try {
        const { id } = req.query
        const data = await UserController.updateUser(String(id), req.body)
        return res.status(200).json(data)
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }
    case "DELETE":
      try {
        const { id } = req.query
        await UserController.deleteUser(String(id))
        return res.status(204)
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
