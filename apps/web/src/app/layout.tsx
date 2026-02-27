import type { Metadata, Viewport } from 'next'
import { Nunito_Sans } from 'next/font/google'
import './globals.css'

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito-sans',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Guild Ads',
    template: '%s | Guild Ads',
  },
  description: 'Easy, privacy-friendly ad network for indie apps',
  applicationName: 'Guild Ads',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#0f172a' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    title: 'Guild Ads',
    description: 'Easy, privacy-friendly ad network for indie apps',
    siteName: 'Guild Ads',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Guild Ads logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guild Ads',
    description: 'Easy, privacy-friendly ad network for indie apps',
    images: ['/twitter-image.png'],
  },
  alternates: {
    canonical: '/',
  },
  other: {
    'msapplication-TileColor': '#0f172a',
    'msapplication-TileImage': '/mstile-150x150.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={nunitoSans.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
