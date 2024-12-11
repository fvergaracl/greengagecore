import axios from "axios"
import cookie from "cookie"

export default async function handler(req, res) {
  const cookies = cookie.parse(req.headers.cookie || "")
  const token = cookies.access_token

  if (!token) {
    return res.status(401).json({ error: "No autenticado" })
  }

  const { KEYCLOAK_BASE_URL, KEYCLOAK_REALM } = process.env

  try {
    const userInfo = await axios.get(
      `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    res.json(userInfo.data)
  } catch (error) {
    res.status(401).json({ error: "Token inválido o expirado" })
  }
}
