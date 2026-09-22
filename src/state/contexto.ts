import { createContext, useContext } from 'react'
import type { User } from '../lib/types'

export type Tema = 'claro' | 'oscuro' | 'sistema'
export type TipoBrindis = 'info' | 'ok' | 'error'

export interface AppCtx {
  usuario: User | null
  cambiarUsuario: (id: string | null) => void
  /** Puede aprobar y rechazar publicaciones: moderación o administración. */
  esModerador: boolean
  /** Acceso total, incluido el módulo de ferias. */
  esAdmin: boolean
  tema: Tema
  ponerTema: (t: Tema) => void
  /** Se incrementa con cada escritura en la base: fuerza el recálculo de vistas. */
  revision: number
  avisar: (mensaje: string, tipo?: TipoBrindis) => void
}

/**
 * El contexto vive aquí y no junto al provider a propósito: un módulo que
 * exporta algo que no es un componente se recarga entero en cada cambio, y eso
 * crea un contexto nuevo mientras los consumidores siguen apuntando al viejo.
 */
export const Ctx = createContext<AppCtx | null>(null)

export const useApp = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
