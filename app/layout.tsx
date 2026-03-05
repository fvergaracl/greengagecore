import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { I18nProvider } from "@/components/i18n/I18nProvider"
import { Providers } from "@/components/Providers"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "GreenCrowd — Citizen Science Platform",
  description: "Collaborative environmental monitoring and citizen science platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <I18nProvider>{children}</I18nProvider>
        </Providers>
      </body>
    </html>
  )
}
