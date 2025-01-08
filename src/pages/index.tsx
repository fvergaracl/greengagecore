import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import cookie from "cookie"
import { useTranslation } from "@/hooks/useTranslation"

interface HomeProps {
  flashMessage?: string
}

export default function Home({ flashMessage }: HomeProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [message, setMessage] = useState(flashMessage)

  useEffect(() => {
    if (flashMessage) {
      const timer = setTimeout(() => setMessage(null), 5000) // 5 segundos
      return () => clearTimeout(timer)
    }
  }, [flashMessage])

  const handleLogin = () => {
    router.push("/api/auth/login")
  }

  return (
    <div className='h-screen bg-gradient-to-b from-gray-900 to-gray-700 flex items-center justify-center'>
      <div className='w-11/12 max-w-sm bg-gray-800 shadow-lg rounded-lg p-6 flex flex-col items-center'>
        <div className='bg-gray-900 w-32 h-32 flex items-center justify-center rounded-full mb-6'>
          <img
            src='/images/GREENGAGE_white_logo.png'
            alt='GREENGAGE Logo'
            className='w-28 h-28 object-contain'
          />
        </div>
        <h1 className='text-2xl font-bold text-white mb-4 text-center'>
          {t("Welcome to GREENGAGE")}
        </h1>
        {message && (
          <p className='mb-4 text-center text-yellow-400'>{message}</p>
        )}
        <p className='text-center text-gray-300 mb-6'>
          {t("A simple app to manage your campaigns")}
        </p>
        <button
          onClick={handleLogin}
          className='w-full py-3 text-white font-bold bg-blue-600 rounded-lg hover:bg-blue-700 transition-all'
        >
          {t("Log in")}
        </button>
      </div>
    </div>
  )
}

export async function getServerSideProps({ req, res }) {
  const cookies = cookie.parse(req.headers.cookie || "")
  const flashMessage = cookies.flash_message || null

  if (!flashMessage) {
    const isAuthenticated = cookies.access_token

    if (isAuthenticated) {
      res.writeHead(302, { Location: "/dashboard" })
      res.end()
      return { props: {} }
    }
  }

  return { props: { flashMessage } }
}
