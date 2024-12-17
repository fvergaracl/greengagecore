import cookie from "cookie"

export default function clearAllCookies(req, res) {
  const cookies = req.headers.cookie

  if (!cookies) return

  const parsedCookies = cookie.parse(cookies)
  const expiredCookies = Object.keys(parsedCookies).map(cookieName =>
    cookie.serialize(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/"
    })
  )

  res.setHeader("Set-Cookie", expiredCookies)
}