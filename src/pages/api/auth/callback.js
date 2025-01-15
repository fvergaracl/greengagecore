import axios from "axios"
import cookie from "cookie"
import getUserInfo from "@/utils/getUserInfo"
import prisma from "@/prismaClient"
import setAuthCookies from "@/utils/setAuthCookies"

export default async function handler(req, res) {
  const {
    KEYCLOAK_CLIENT_SECRET,
    KEYCLOAK_BASE_URL,
    KEYCLOAK_REALM,
    KEYCLOAK_CLIENT_ID,
    NEXTAUTH_URL
  } = process.env

  const { code } = req.query

  if (!code) {
    return res.status(400).json({ error: "Authorization code missing" })
  }

  const cookies = cookie.parse(req.headers.cookie || "")
  const codeVerifier = cookies.code_verifier

  try {
    const tokenResponse = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: KEYCLOAK_CLIENT_ID,
        client_secret: KEYCLOAK_CLIENT_SECRET,
        redirect_uri: `${NEXTAUTH_URL}/api/auth/callback`,
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    const { access_token, refresh_token, id_token, expires_in } =
      tokenResponse.data

    const userInfo = await getUserInfo(access_token)
    const userSub = userInfo.sub

    let user = await prisma.user.findUnique({
      where: { sub: userSub }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          sub: userSub
        }
      })
      console.log("New user created:", user)
    } else {
      console.log("User already exists:", user)
    }

    const newTokenData = {
      access_token: {
        value: access_token,
        maxAge: expires_in
      },
      refresh_token: {
        value: refresh_token,
        maxAge: expires_in
      },
      id_token: {
        value: id_token,
        maxAge: expires_in
      }
    }
    setAuthCookies(res, newTokenData)

    res.redirect("/dashboard")
  } catch (error) {
    console.error("Error during callback process:", error.message)
    res
      .status(500)
      .json({ error: "Failed to complete the authentication flow" })
  }
}
