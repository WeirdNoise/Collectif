import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement depuis le .env (local) ou les variables système (Vercel)
  // Utilise '.' pour le chemin courant afin d'éviter les erreurs de typage sur process.cwd()
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    // Suppression de "base: './'" pour une compatibilité optimale avec Vercel (utilise la racine '/')
    
    define: {
      // Polyfill de process.env pour éviter le crash "process is not defined" dans le navigateur
      // On injecte explicitement la clé API et le NODE_ENV
      'process.env': {
        API_KEY: env.API_KEY,
        NODE_ENV: mode,
      }
    },
    server: {
      host: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    },
    preview: {
      allowedHosts: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
      }
    }
  }
})