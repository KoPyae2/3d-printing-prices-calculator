import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        name: 'PolyCrafy Calculator',
        short_name: 'PolyCrafy',
        description: 'Price 3D printing jobs in seconds: filament, machine time, CAD fees and packaging.',
        theme_color: '#080a0e',
        background_color: '#080a0e',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['business', 'productivity', 'utilities'],
      },

      workbox: {
        // The web manifest is added by the plugin itself; globbing it again creates
        // duplicate entries with different revisions and breaks the precache install.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
      },

      devOptions: {
        enabled: false,
        navigateFallback: 'index.html',
        suppressWarnings: true,
        type: 'module',
      },
    }),
  ],
})
