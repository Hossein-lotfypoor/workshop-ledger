// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      manifest: false // چون دستی در پوشه public ساختیمش
    })
  ],
  base: '/workshop-ledger/', // این مسیر برای اجرای درست روی گیت‌هاب پیجز الزامی است
});