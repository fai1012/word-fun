import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Vital: Bake the API key into the static build
    },
    server: {
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
      allowedHosts: true,
    }
  }
})