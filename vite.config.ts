import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge toutes les variables d'environnement
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    // SUPPRESSION DE "base: './'" : Sur Vercel, il est préférable d'utiliser le chemin absolu par défaut '/'
    // pour garantir que les assets (CSS/JS) sont chargés correctement depuis la racine.
    
    define: {
      // Polyfill robuste de process.env
      // Au lieu de remplacer juste une clé, on remplace l'objet process.env entier par un objet littéral.
      // Cela évite l'erreur "process is not defined" si une librairie essaie d'accéder à process.env.NODE_ENV par exemple.
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