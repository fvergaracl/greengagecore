import axios from "axios"
import cookie from "cookie"

export async function validateKeycloakToken(req: any) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "")
    const token = cookies.access_token

    if (!token) {
      throw new Error("No access token provided")
    }

    const { KEYCLOAK_BASE_URL, KEYCLOAK_REALM } = process.env

    const userInfoResponse = await axios.get(
      `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    const decoded_token = token.split(".")[1]
    const base64 = decoded_token.replace(/-/g, "+").replace(/_/g, "/")
    const userInfo_decoded = JSON.parse(
      Buffer.from(base64, "base64").toString("binary")
    )
    const userInfo = userInfoResponse.data

    const userId = userInfo.sub

    if (!userId) {
      throw new Error("User ID not found in token")
    }

    return { userId, userInfo }
  } catch (error: any) {
    console.error("Token validation failed:", error.message)
    throw new Error("Unauthorized: Invalid or expired token")
  }
}
