import type { MetadataRoute } from 'next'

/**
 * PWA manifest. Mobile "Add to home screen" prompts pick up the name,
 * icons, and theme colors from here.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TuskaEx — Professional Trading Platform',
    short_name: 'TuskaEx',
    description: 'Professional forex and CFD trading platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#D60101',
    icons: [
      { src: '/marketing/tuskaex_fevicon.png', sizes: 'any', type: 'image/png' },
    ],
  }
}
