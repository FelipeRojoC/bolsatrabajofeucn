import { TIPOS } from '../lib/constants'
import { compacto, formatearPrecio, hace, tiempoRestante } from '../lib/format'
import { alternarGuardado, listarGuardados } from '../lib/api'
import type { Post } from '../lib/types'
import { Icono } from './Iconos'
import { AnilloVigencia, PortadaGenerada } from './UI'
import { useApp } from '../state/contexto'

interface Props {
  post: Post
  alAbrir: (post: Post) => void
  /** Muestra estado y métricas del autor en vez de la vista pública. */
  vistaAutor?: boolean
}

const ESTADO_ETIQUETA: Record<Post['status'], { texto: string; clase: string }> = {
  pendiente: { texto: 'En revisión', clase: 'etiqueta-aviso' },
  aprobado: { texto: 'Publicado', clase: 'etiqueta-ok' },
  rechazado: { texto: 'Rechazado', clase: 'etiqueta-critico' },
  expirado: { texto: 'Expirado', clase: 'etiqueta-contorno' },
  archivado: { texto: 'Cerrado', clase: 'etiqueta-contorno' },
}

export const TarjetaAviso = ({ post, alAbrir, vistaAutor }: Props) => {
  const { avisar } = useApp()
  const guardado = listarGuardados().includes(post.id)
  const t = tiempoRestante(post.expiraEn, post.diasVigencia)
  const tipo = TIPOS[post.type]
  const inactivo = post.status !== 'aprobado'

  const guardar = (e: React.MouseEvent) => {
    e.stopPropagation()
    const ahora = alternarGuardado(post.id)
    avisar(ahora ? 'Guardado en tu lista' : 'Quitado de tu lista', 'ok')
  }

  return (
    <article
      className={`tarjeta${inactivo ? ' atenuada' : ''}`}
      onClick={() => alAbrir(post)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          alAbrir(post)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${tipo.label}: ${post.titulo}`}
    >
      <div className="tarjeta-portada">
        {post.imagenes[0] ? (
          <img src={post.imagenes[0]} alt="" loading="lazy" />
        ) : (
          <PortadaGenerada id={post.id} tipo={post.type} />
        )}

        <span className="cinta-tipo">
          <Icono nombre={post.type} tam={13} style={{ color: tipo.color }} />
          {post.type === 'perdido' ? (post.lostKind === 'encontrado' ? 'Encontrado' : 'Perdido') : tipo.label}
        </span>

        {!vistaAutor && (
          <button
            className={`btn-guardar${guardado ? ' guardado' : ''}`}
            onClick={guardar}
            aria-pressed={guardado}
            aria-label={guardado ? 'Quitar de guardados' : 'Guardar aviso'}
          >
            <Icono nombre="corazon" tam={16} fill={guardado ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="tarjeta-cuerpo">
        <div className="tarjeta-superior">
          {vistaAutor && (
            <span className={`etiqueta ${ESTADO_ETIQUETA[post.status].clase}`}>{ESTADO_ETIQUETA[post.status].texto}</span>
          )}
          {post.resuelto && <span className="etiqueta etiqueta-ok"><Icono nombre="visto" tam={11} />Resuelto</span>}
          {post.type !== 'perdido' && !vistaAutor && (
            <span className="tarjeta-precio">
              {formatearPrecio(post.precio, post.precioNota)}
              {post.precio !== undefined && post.precio > 0 && post.precioNota && <small>{post.precioNota}</small>}
            </span>
          )}
        </div>

        <h3 className="tarjeta-titulo recorte-2">{post.titulo}</h3>

        <div className="tarjeta-meta">
          <Icono nombre="pin" tam={13} />
          <span className="recorte-2">{post.ubicacion.zona} · {post.ubicacion.campus.split('—')[0].trim()}</span>
        </div>

        <div className="tarjeta-pie">
          <div className="tarjeta-stats">
            <span title={`${post.stats.vistas} visitas al aviso`}>
              <Icono nombre="ojo" tam={13} />{compacto(post.stats.vistas)}
            </span>
            <span title={`${post.stats.clicsContacto} personas pidieron el contacto`}>
              <Icono nombre="clic" tam={13} />{compacto(post.stats.clicsContacto)}
            </span>
          </div>

          {post.status === 'aprobado' ? (
            <div className="fila" style={{ gap: 7 }}>
              <span className={`mini ${t.urgente ? 'fuerte' : 'muy-tenue'}`} style={t.urgente ? { color: 'var(--aviso-tinta)' } : undefined}>
                {t.etiqueta}
              </span>
              <AnilloVigencia progreso={t.progreso} etiqueta={t.etiqueta} urgente={t.urgente} expirado={t.expirado} tam={26} />
            </div>
          ) : (
            <span className="mini muy-tenue">{hace(post.creadoEn)}</span>
          )}
        </div>
      </div>
    </article>
  )
}
