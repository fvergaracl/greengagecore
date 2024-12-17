import axios from "axios"
import cookie from "cookie"

export default async function handler(req, res) {
  const cookies = cookie.parse(req.headers.cookie || "")
  const token = cookies.access_token

  if (!token) {
    return res.status(401).json({ error: "No autenticado" })
  }

  try {
    const userInfo = await axios.get(
      `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    res.status(200).json(userInfo.data)
  } catch (error) {
    console.error(
      "Error validando token:",
      error.response?.data || error.message
    )
    res.status(401).json({ error: "Token inválido o expirado" })
  }
}
