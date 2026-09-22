import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import type { User } from '../lib/types'
import { Icono } from '../components/Iconos'
import { hayBackend } from '../lib/supabase'
import { Ctx, type AppCtx, type Tema, type TipoBrindis } from './contexto'

interface Brindis {
  id: number
  mensaje: string
  tipo: TipoBrindis
}

const CLAVE_TEMA = 'feucn-tema'

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [revision, setRevision] = useState(0)
  const [brindis, setBrindis] = useState<Brindis[]>([])
  const [cargando, setCargando] = useState(hayBackend())
  const [tema, setTema] = useState<Tema>(() => {
    try {
      return (localStorage.getItem(CLAVE_TEMA) as Tema) || 'sistema'
    } catch {
      return 'sistema'
    }
  })
  const contador = useRef(0)

  // Cualquier escritura en la capa de datos repinta la app.
  useEffect(() => {
    const desuscribir = api.suscribir(() => setRevision((r) => r + 1))
    return () => {
      desuscribir()
    }
  }, [])

  useEffect(() => {
    const raiz = document.documentElement
    if (tema === 'sistema') raiz.removeAttribute('data-theme')
    else raiz.setAttribute('data-theme', tema === 'oscuro' ? 'dark' : 'light')
    try {
      localStorage.setItem(CLAVE_TEMA, tema)
    } catch {
      /* sin persistencia, el tema dura la sesión */
    }
  }, [tema])

  // Los avisos vencen solos: se barre al abrir y cada minuto.
  useEffect(() => {
    api.barrerExpirados()
    const t = setInterval(() => api.barrerExpirados(), 60_000)
    return () => clearInterval(t)
  }, [])

  // Con backend, la caché se llena desde la base al abrir y al volver a la
  // pestaña: si alguien publicó algo desde otro dispositivo, aparece.
  useEffect(() => {
    if (!hayBackend()) {
      setCargando(false)
      return
    }
    void api.sincronizar().finally(() => setCargando(false))

    const alVolver = () => {
      if (document.visibilityState === 'visible') void api.sincronizar()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [])

  // La sesión se deriva de la revisión actual: no hace falta duplicarla en estado.
  // `revision` no se usa dentro del cálculo; está para invalidarlo cuando la
  // capa de datos avisa que algo cambió.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const usuario = useMemo<User | null>(() => api.obtenerSesion(), [revision])

  const avisar = useCallback((mensaje: string, tipo: TipoBrindis = 'info') => {
    const id = ++contador.current
    setBrindis((b) => [...b, { id, mensaje, tipo }])
    setTimeout(() => setBrindis((b) => b.filter((x) => x.id !== id)), 4200)
  }, [])

  const cambiarUsuario = useCallback((id: string | null) => {
    void api.iniciarSesion(id)
  }, [])

  const valor = useMemo<AppCtx>(
    () => ({
      usuario,
      cambiarUsuario,
      esModerador: usuario?.role === 'moderador' || usuario?.role === 'admin',
      esAdmin: usuario?.role === 'admin',
      tema,
      ponerTema: setTema,
      revision,
      avisar,
      cargando,
      conBackend: hayBackend(),
    }),
    [usuario, cambiarUsuario, tema, revision, avisar, cargando],
  )

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="brindis-zona" role="status" aria-live="polite">
        {brindis.map((b) => (
          <div key={b.id} className={`brindis ${b.tipo === 'ok' ? 'brindis-ok' : b.tipo === 'error' ? 'brindis-error' : ''}`}>
            <Icono nombre={b.tipo === 'ok' ? 'visto' : b.tipo === 'error' ? 'alerta' : 'info'} tam={17} />
            <span>{b.mensaje}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
