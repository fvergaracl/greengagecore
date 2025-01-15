import { NextApiResponse } from "next"
import cookie from "cookie"

interface TokenData {
  value: string
  maxAge: number
}

interface TokenProps {
  access_token: TokenData
  refresh_token: TokenData
  id_token: TokenData
}

const setAuthCookies = (res: NextApiResponse, propsToken: TokenProps): void => {
  const { access_token, refresh_token, id_token } = propsToken
  res.setHeader("Set-Cookie", [
    cookie.serialize("access_token", access_token?.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: access_token?.maxAge,
      path: "/"
    }),
    cookie.serialize("refresh_token", refresh_token?.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: refresh_token?.maxAge,
      path: "/"
    }),
    cookie.serialize("id_token", id_token?.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: id_token?.maxAge,
      path: "/"
    })
  ])
}

export default setAuthCookies
