import { defineConfig } from 'vite'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  // Firebase Hosting serves the app from the domain root in every environment.
  base: '/',
  plugins: [tailwind()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:2567',
      '/matchmake': 'http://127.0.0.1:2567',
    },
  },
})
