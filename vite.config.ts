import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement depuis le fichier .env (si local) ou l'environnement système (Vercel)
  // Le troisième argument '' permet de charger toutes les variables, pas seulement celles commençant par VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Utiliser des chemins relatifs pour que l'app fonctionne dans n'importe quel sous-dossier ou URL de preview
    base: './',
    define: {
      // Injection explicite de la clé API pour qu'elle soit disponible dans le navigateur
      // Cela remplace 'process.env.API_KEY' par sa valeur réelle lors du build
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      // Écouter sur toutes les IPs (utile pour certains environnements cloud)
      host: true,
      // Activer CORS pour le développement
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    },
    preview: {
      allowedHosts: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        // Suppression explicite des restrictions de frame pour les previews
        'X-Frame-Options': 'ALLOWALL',
      }
    }
  }
})