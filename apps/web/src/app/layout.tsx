import type { Metadata } from 'next'
import Image from 'next/image'
import './globals.css'
// import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'AgriTrack - CRM Machinery Monitoring',
  description: 'Smart India Hackathon 2025 - Real-time monitoring of Crop Residue Management machinery',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="font-sans antialiased">
        {/* Global Watermark */}
        <div className="fixed inset-0 pointer-events-none z-[-1]">
          <Image
            src="/assets/watermark.jpg"
            alt=""
            fill
            className="object-cover opacity-[0.03]"
            priority
          />
        </div>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
