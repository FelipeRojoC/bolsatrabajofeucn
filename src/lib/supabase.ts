/**
 * Cliente de Supabase.
 *
 * La app funciona sin Supabase: mientras no existan las variables de entorno,
 * `src/lib/api.ts` sigue trabajando contra localStorage y todo se ve igual.
 * Apenas se definen, `hayBackend()` devuelve true y se puede ir migrando
 * función por función sin apagar nada.
 *
 * Para activarlo, crea un archivo `.env.local` en la raíz con:
 *
 *   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
 *
 * La clave `anon` es pública por diseño: lo que protege los datos son las
 * políticas RLS de `supabase/schema.sql`, no el secreto de esta clave. La que
 * NUNCA va en el frontend es la `service_role`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hayBackend = () => Boolean(URL && ANON)

let cliente: SupabaseClient | null = null

/**
 * Devuelve el cliente, cargando la librería solo si hace falta.
 * El import dinámico evita que 120 KB de Supabase entren al bundle de quien
 * abre la app sin backend configurado.
 */
export const supabase = async (): Promise<SupabaseClient | null> => {
  if (!hayBackend()) return null
  if (cliente) return cliente
  const { createClient } = await import('@supabase/supabase-js')
  cliente = createClient(URL!, ANON!, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return cliente
}

/** Nombres de tabla, para no escribirlos sueltos por ahí. */
export const TABLAS = {
  perfiles: 'perfiles',
  avisos: 'avisos',
  respuestas: 'respuestas_foro',
  eventos: 'eventos',
  reportes: 'reportes',
  emprendimientos: 'emprendimientos',
  solicitudes: 'solicitudes_plan',
  ferias: 'ferias',
  postulaciones: 'postulaciones_feria',
} as const
