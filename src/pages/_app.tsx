import "@/sentry.client.config"
import "leaflet/dist/leaflet.css"
import "../styles/globals.css"
import { StrictMode, ReactNode, useEffect, useState } from "react"
import { AppProps } from "next/app"
import { useRouter } from "next/router"
import { DashboardProvider } from "@/context/DashboardContext"
import { AdminProvider } from "@/context/AdminContext"

// import enhanceConsole from "@/utils/enhanceConsole"

// if (typeof window !== "undefined") {
//   let isEnhanced = (window as any).__ENHANCED_CONSOLE__ || false
//   if (!isEnhanced) {
//     enhanceConsole()
//     ;(window as any).__ENHANCED_CONSOLE__ = true
//   }
// }

export default function MyApp({ Component, pageProps }: AppProps) {
  const [configLoaded, setConfigLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadRuntimeConfig = () => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script")
        script.src = "/runtime-config.js"
        script.async = false
        script.onload = () => {
          console.log("[+] runtime-config.js cargado:", window.__ENV__)
          setConfigLoaded(true)
          resolve()
        }
        script.onerror = () => {
          console.error("[-] Error cargando runtime-config.js")
          reject()
        }
        document.body.appendChild(script)
      })
    }

    loadRuntimeConfig().catch(() =>
      console.error("No se pudo cargar la configuración en runtime.")
    )
  }, [])

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then(reg => console.log("SW Registered", reg.scope))
        .catch(err => console.error("SW Error", err))
    }
  }, [])
  
useEffect(() => {
  const setVH = () => {
    const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
    document.documentElement.style.setProperty("--app-vh", `${vh}px`);
  };
  setVH();
  window.addEventListener("resize", setVH);
  window.visualViewport?.addEventListener("resize", setVH);
  window.addEventListener("orientationchange", setVH);
  return () => {
    window.removeEventListener("resize", setVH);
    window.visualViewport?.removeEventListener("resize", setVH);
    window.removeEventListener("orientationchange", setVH);
  };
}, []);

  if (!configLoaded) {
    return <></>
  }

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
      <div id="app-shell" className="app-shell">
      <WrappedComponent {...pageProps} />
      </div>
    </StrictMode>
  )
}

/**
 * Higher Order Component para envolver un componente en un Provider
 */

const withProvider = <P extends object>(
  Comp: React.ComponentType<P>,
  Provider: ({ children }: { children: React.ReactNode }) => JSX.Element
) => {
  const Wrapped = (props: P) => (
    <Provider>
      <Comp {...props} />
    </Provider>
  )
  Wrapped.displayName = `WithProvider(${Comp.displayName || Comp.name || "Anonymous"})`
  return Wrapped
}
