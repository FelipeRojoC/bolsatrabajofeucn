import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icono, type NombreIcono } from './Iconos'
import { iniciales } from '../lib/format'
import type { PostType } from '../lib/types'

/* ── Modal ──────────────────────────────────────────────────────────────── */

interface ModalProps {
  abierto: boolean
  alCerrar: () => void
  titulo?: ReactNode
  subtitulo?: ReactNode
  children: ReactNode
  pie?: ReactNode
  ancho?: boolean
  etiquetaCierre?: string
}

export const Modal = ({ abierto, alCerrar, titulo, subtitulo, children, pie, ancho, etiquetaCierre = 'Cerrar' }: ModalProps) => {
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const previo = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        alCerrar()
        return
      }
      if (e.key !== 'Tab' || !caja.current) return
      const focos = caja.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focos.length) return
      const primero = focos[0]
      const ultimo = focos[focos.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alTeclear)
    const t = setTimeout(() => {
      const preferido = caja.current?.querySelector<HTMLElement>('[data-autofoco]')
      if (preferido) preferido.focus()
      else caja.current?.focus()
    }, 30)

    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = overflow
      clearTimeout(t)
      previo?.focus?.()
    }
  }, [abierto, alCerrar])

  if (!abierto) return null

  return createPortal(
    <div className="velo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div
        className={`modal${ancho ? ' modal-ancho' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof titulo === 'string' ? titulo : undefined}
        ref={caja}
        tabIndex={-1}
      >
        <div className="modal-asa" />
        {(titulo || subtitulo) && (
          <div className="modal-cabecera">
            <div className="crecer">
              {titulo && <h3>{titulo}</h3>}
              {subtitulo && <p className="chico tenue" style={{ marginTop: 3 }}>{subtitulo}</p>}
            </div>
            <button className="btn btn-fantasma btn-icono btn-chico" onClick={alCerrar} aria-label={etiquetaCierre}>
              <Icono nombre="cerrar" tam={17} />
            </button>
          </div>
        )}
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ── Anillo de vigencia ─────────────────────────────────────────────────── */

interface AnilloProps {
  progreso: number
  etiqueta: string
  urgente?: boolean
  expirado?: boolean
  tam?: number
  textoCentro?: string
}

/**
 * Comunica de un vistazo cuánto le queda al aviso dentro de su ventana de
 * 5 días. El arco se vacía con el tiempo; ámbar bajo 24 h, rojo al expirar.
 */
export const AnilloVigencia = ({ progreso, etiqueta, urgente, expirado, tam = 34, textoCentro }: AnilloProps) => {
  const r = (tam - 4) / 2
  const circ = 2 * Math.PI * r
  const restante = Math.max(0, 1 - progreso)
  return (
    <div
      className={`anillo${urgente ? ' urgente' : ''}${expirado ? ' expirado' : ''}`}
      style={{ width: tam, height: tam }}
      title={expirado ? 'Aviso expirado' : `Vence en ${etiqueta}`}
    >
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} role="img" aria-label={expirado ? 'Aviso expirado' : `Quedan ${etiqueta} de vigencia`}>
        <circle className="anillo-pista" cx={tam / 2} cy={tam / 2} r={r} fill="none" strokeWidth={2.5} />
        <circle
          className="anillo-arco"
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          fill="none"
          strokeWidth={2.5}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - restante)}
        />
      </svg>
      {textoCentro && <span className="anillo-centro">{textoCentro}</span>}
    </div>
  )
}

/* ── Portada generada ───────────────────────────────────────────────────── */

const TONOS: Record<PostType | 'emprendimiento', [string, string]> = {
  trabajo: ['#2a78d6', '#0f9aa8'],
  venta: ['#eb6834', '#eda100'],
  perdido: ['#1baf7a', '#2a78d6'],
  emprendimiento: ['#4a3aa7', '#e87ba4'],
}

const ICONO_TIPO: Record<PostType, NombreIcono> = {
  trabajo: 'trabajo',
  venta: 'venta',
  perdido: 'perdido',
}

/**
 * Cuando un aviso no trae fotos, en vez de un placeholder gris se dibuja una
 * portada derivada de su id: siempre la misma para el mismo aviso.
 */
export const PortadaGenerada = ({ id, tipo }: { id: string; tipo: PostType }) => {
  const semilla = [...id].reduce((a, c) => a + c.charCodeAt(0), 0)
  const [a, b] = TONOS[tipo]
  const rot = semilla % 90
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(${120 + rot}deg, ${a}1f, ${b}2e)`,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <defs>
          <pattern id={`p-${id}`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform={`rotate(${rot % 45})`}>
            <line x1="0" y1="0" x2="0" y2="16" stroke={a} strokeWidth="0.7" opacity="0.35" />
          </pattern>
        </defs>
        <rect width="160" height="100" fill={`url(#p-${id})`} />
        <circle cx={20 + (semilla % 120)} cy={18 + (semilla % 60)} r={26} fill={b} opacity="0.14" />
      </svg>
      <Icono nombre={ICONO_TIPO[tipo]} tam={40} style={{ color: a, opacity: 0.75, position: 'relative' }} />
    </div>
  )
}

/* ── Avatar ─────────────────────────────────────────────────────────────── */

export const Avatar = ({ nombre, color, tam = 'md' }: { nombre: string; color: string; tam?: 'sm' | 'md' | 'lg' }) => (
  <span
    className={`avatar${tam === 'sm' ? ' avatar-sm' : tam === 'lg' ? ' avatar-lg' : ''}`}
    style={{ background: color }}
    aria-hidden="true"
  >
    {iniciales(nombre)}
  </span>
)

/* ── Estado vacío ───────────────────────────────────────────────────────── */

export const Vacio = ({
  icono = 'buscar',
  titulo,
  texto,
  accion,
}: {
  icono?: NombreIcono
  titulo: string
  texto?: string
  accion?: ReactNode
}) => (
  <div className="vacio">
    <div className="vacio-glifo">
      <Icono nombre={icono} tam={26} />
    </div>
    <h3>{titulo}</h3>
    {texto && <p>{texto}</p>}
    {accion && <div style={{ marginTop: 18 }}>{accion}</div>}
  </div>
)

/* ── Nota en línea ──────────────────────────────────────────────────────── */

export const Nota = ({
  tono = 'neutro',
  icono,
  children,
}: {
  tono?: 'neutro' | 'marca' | 'aviso' | 'critico' | 'ok'
  icono?: NombreIcono
  children: ReactNode
}) => (
  <div className={`nota${tono !== 'neutro' ? ` nota-${tono}` : ''}`}>
    {icono && <Icono nombre={icono} tam={17} />}
    <div className="crecer">{children}</div>
  </div>
)

/* ── Esqueletos de carga ────────────────────────────────────────────────── */

export const EsqueletoTarjetas = ({ cantidad = 6 }: { cantidad?: number }) => (
  <div className="grilla-avisos" aria-hidden="true">
    {Array.from({ length: cantidad }).map((_, i) => (
      <div key={i} className="panel" style={{ overflow: 'hidden' }}>
        <div className="esqueleto" style={{ aspectRatio: '16 / 10', borderRadius: 0 }} />
        <div style={{ padding: 15, display: 'grid', gap: 9 }}>
          <div className="esqueleto" style={{ height: 13, width: '45%' }} />
          <div className="esqueleto" style={{ height: 15, width: '85%' }} />
          <div className="esqueleto" style={{ height: 15, width: '60%' }} />
          <div className="esqueleto" style={{ height: 11, width: '35%', marginTop: 6 }} />
        </div>
      </div>
    ))}
  </div>
)
