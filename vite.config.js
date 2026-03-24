import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readdirSync } from 'fs'

function getPages() {
  return Object.fromEntries(
    readdirSync(resolve(__dirname, 'src'))
      .filter(f => f.endsWith('.html'))
      .map(f => [f.replace('.html', ''), resolve(__dirname, 'src', f)])
  )
}

export default defineConfig({
  root: 'src',
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: getPages() }
  },
  server: {
    port: 5173,
    open: '/login.html'
  }
})
