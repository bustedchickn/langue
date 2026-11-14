import { defineConfig } from 'vite'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves this repository from /langue/; local development stays at /.
  base: process.env.GITHUB_ACTIONS ? '/langue/' : '/',
  plugins: [tailwind()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:2567',
      '/matchmake': 'http://127.0.0.1:2567',
    },
  },
})
