import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
import { AuthProvider } from '@/lib/auth';

export const viewport: Viewport = {
  themeColor: '#0B0F17',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Proyecto Taxi | Viajes Interurbanos Venezuela',
  description:
    'PWA de viajes compartidos e interurbanos en Venezuela. Rutas seguras, conductores verificados y reserva de asientos entre ciudades.',
  applicationName: 'Proyecto Taxi',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Proyecto Taxi',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/icons/favicon-32x32.png'],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Proyecto Taxi - Viajes Interurbanos en Venezuela',
    description:
      'Viajes compartidos seguros en Venezuela: Caracas, Valencia, Maracay, Barquisimeto y más.',
    type: 'website',
    locale: 'es_VE',
    siteName: 'Proyecto Taxi',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark h-full bg-[#0B0F17] text-zinc-100 antialiased">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full bg-[#0B0F17] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
        <PwaRegister />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
