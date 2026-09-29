import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite'; // 🟢 ۱. این امپورت حیاتی برای نسخه ۴ اضافه شد

const appBase = '/workshop-ledger/';

export default defineConfig({
  base: appBase,

  plugins: [
    tailwindcss(), // 🟢 ۲. پلاگین تیل‌ویند حتماً باید اولین گزینه در آرایه باشد
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        id: appBase,
        name: 'دفتر کارگاه',
        short_name: 'کارگاه',
        description: 'مدیریت کارگاه، فاکتورها و موجودی انبار',
        lang: 'fa',
        dir: 'rtl',
        start_url: appBase,
        scope: appBase,
        display: 'standalone',
        background_color: '#f2f5f2',
        theme_color: '#142b24',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webp,woff2}'],
        cleanupOutdatedCaches: true
      }
    })
  ]
});