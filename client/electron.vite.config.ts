import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: 'electron/index.ts'
      },
      rollupOptions: {
        external: ['better-sqlite3']
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    build: {
      lib: {
        entry: 'electron/preload.ts'
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@renderer': resolve(__dirname, 'src')
      }
    },
    plugins: [react()]
  }
})
