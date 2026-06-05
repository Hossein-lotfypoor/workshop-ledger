import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite'; // 🟢 ۱. این امپورت حیاتی برای نسخه ۴ اضافه شد

export default defineConfig({
  base: '/workshop-ledger/', 

  plugins: [
    tailwindcss(), // 🟢 ۲. پلاگین تیل‌ویند حتماً باید اولین گزینه در آرایه باشد
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Workshop Ledger',
        short_name: 'Ledger',
        description: 'سیستم حسابداری کارگاه',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => true,
            handler: 'NetworkFirst', 
            options: {
              cacheName: 'workshop-v3', // 🟢 ورژن کچ رو گذاشتیم v3 تا کچ‌های خراب قبلی کاملا باطل بشن
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              networkTimeoutSeconds: 3 
            }
          }
        ]
      }
    })
  ]
});