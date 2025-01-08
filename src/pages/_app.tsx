import "leaflet/dist/leaflet.css"
import "../styles/globals.css"
import { StrictMode } from "react"
import { AppProps } from "next/app"
import { DashboardProvider } from "../context/DashboardContext"

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <StrictMode>
      <DashboardProvider>
        <Component {...pageProps} />
      </DashboardProvider>
    </StrictMode>
  )
}
