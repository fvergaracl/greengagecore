import "leaflet/dist/leaflet.css"
import "../styles/globals.css"
import { StrictMode, ReactNode } from "react"
import { AppProps } from "next/app"
import { useRouter } from "next/router"
import { DashboardProvider } from "../context/DashboardContext"
import { AdminProvider } from "../context/AdminContext"
import enhanceConsole from "@/utils/enhanceConsole"
let isEnhanced = false
if (!isEnhanced) {
  enhanceConsole()
  isEnhanced = true
}
const withProvider = (
  Component: AppProps["Component"],
  Provider: ({ children }: { children: ReactNode }) => JSX.Element
) => {
  const WrappedComponent = (props: AppProps) => (
    <Provider>
      <Component {...props.pageProps} />
    </Provider>
  )

  WrappedComponent.displayName = `WithProvider(${
    Component.displayName || Component.name || "Anonymous"
  })`

  return WrappedComponent
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()

  const contextMapping: Record<
    string,
    ({ children }: { children: ReactNode }) => JSX.Element
  > = {
    "/dashboard": DashboardProvider,
    "/admin": AdminProvider
  }

  const matchedProvider = Object.entries(contextMapping).find(([path]) =>
    router.pathname.startsWith(path)
  )?.[1]

  const WrappedComponent = matchedProvider
    ? withProvider(Component, matchedProvider)
    : Component

  return (
    <StrictMode>
      <WrappedComponent {...pageProps} />
    </StrictMode>
  )
}
