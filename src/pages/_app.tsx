import "leaflet/dist/leaflet.css"
import "../styles/globals.css"
import { AppProps } from "next/app";
import { DashboardProvider } from "../context/DashboardContext";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <DashboardProvider>
      <Component {...pageProps} />
    </DashboardProvider>
  );
}
