import cookie from "cookie"

export default async function handler(req, res) {
  const cookies = cookie.parse(req.headers.cookie || "")
  const access_token =
    req.headers.authorization?.split(" ")[1] || cookies.access_token
  if (!access_token) {
    return res.status(401).json({ error: "No autenticado" })
  }
  return res.status(200).json({ access_token })
}
