import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** La política que el navegador aplica si el hosting no manda sus cabeceras. */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self'",
  // React y Leaflet escriben estilos en el atributo style de los elementos.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
].join('; ')

/**
 * Inyecta la política solo en el build.
 *
 * En desarrollo no va: el recargado en caliente de Vite mete un script en
 * línea en el HTML y `script-src 'self'` lo bloquearía, dejando la app sin
 * refresco automático. Las cabeceras de verdad las sirve el hosting
 * (public/_headers para Netlify y Cloudflare, vercel.json para Vercel); esto
 * es el respaldo por si el sitio termina en un hosting que las ignore.
 */
const cspEnProduccion = (): Plugin => ({
  name: 'csp-en-produccion',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta name="referrer"',
      `<meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer"`,
    ),
})

export default defineConfig({
  plugins: [react(), cspEnProduccion()],
})
