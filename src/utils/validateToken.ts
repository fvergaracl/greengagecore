import cookie from "cookie"
import getUserInfo from "./getUserInfo"

export async function validateKeycloakToken(req: any) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "")
    const token = cookies.access_token

    if (!token) {
      throw new Error("No access token provided")
    }

    const decoded_token = token.split(".")[1]
    const base64 = decoded_token.replace(/-/g, "+").replace(/_/g, "/")
    const userInfo_decoded = JSON.parse(
      Buffer.from(base64, "base64").toString("binary")
    )
    const userInfo = await getUserInfo(token)

    const userId = userInfo.sub
    const userRoles = userInfo_decoded?.roles
    if (!userId) {
      throw new Error("User ID not found in token")
    }

    return { userId, userInfo, userRoles }
  } catch (error: any) {
    console.error("Token validation failed:", error.message)
    throw new Error("Unauthorized: Invalid or expired token")
  }
}
