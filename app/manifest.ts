import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aurora Invest',
    short_name: 'Aurora',
    description: 'Aplikasi Investasi Aman dan Terpercaya',
    start_url: '/login',
    display: 'standalone',
    background_color: '#0B1A30',
    theme_color: '#0B1A30',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
