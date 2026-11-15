import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// Two entry pages: the animated intro (index.html) and the game itself (outpost.html).
// Without listing both, `npm run build` / `npm run preview` only contain the intro and START MISSION leads to a 404.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        outpost: resolve(import.meta.dirname, 'outpost.html'),
      },
    },
  },
})
