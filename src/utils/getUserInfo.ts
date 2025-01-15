import axiosInstance from "./axiosInstance"

const getUserInfo = async (token: string) => {
  try {
    const userInfoResponse = await axiosInstance.get(
      `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    return userInfoResponse.data
  } catch (error: any) {
    console.error("Error getting user info:", error.message)
    return null
  }
}

export default getUserInfo
