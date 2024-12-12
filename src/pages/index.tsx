import { useRouter } from "next/router"

export default function Home() {
  const router = useRouter()

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
          Bienvenido a GREENGAGE
        </h1>
        <p className='text-center text-gray-300 mb-6'>
          Una experiencia única para gestionar tu participación.
        </p>
        <button
          onClick={handleLogin}
          className='w-full py-3 text-white font-bold bg-blue-600 rounded-lg hover:bg-blue-700 transition-all'
        >
          Login con Keycloak
        </button>
      </div>
    </div>
  )
}

// Verificar autenticación en el servidor
export async function getServerSideProps({ req, res }) {
  const cookies = req.headers.cookie || ""
  const isAuthenticated = cookies.includes("access_token")

  if (isAuthenticated) {
    // Redirigir al dashboard si está autenticado
    res.writeHead(302, { Location: "/dashboard" })
    res.end()
    return { props: {} }
  }

  return { props: {} }
}