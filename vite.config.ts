import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Utiliser des chemins relatifs pour que l'app fonctionne dans n'importe quel sous-dossier ou URL de preview
  base: './',
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
})