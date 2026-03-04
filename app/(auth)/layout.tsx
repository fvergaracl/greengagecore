// Layout minimalista para páginas de autenticación.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-3xl font-bold text-green-600">🌿 GreenCrowd</span>
          <p className="mt-1 text-sm text-gray-500">Citizen Science Platform</p>
        </div>
        {children}
      </div>
    </div>
  )
}
