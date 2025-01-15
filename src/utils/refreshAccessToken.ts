import axiosInstance from "./axiosInstance"
const refreshAccessToken = async (refreshToken: string) => {
  try {
    const response = await axiosInstance.post(
      `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    )

    return response.data
  } catch (error: any) {
    console.error("Error refreshing token:", error.message)
    return null
  }
}

export default refreshAccessToken
