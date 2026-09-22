import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import { CONSEJOS_SEGURIDAD, MOTIVOS_REPORTE, TIPOS } from '../lib/constants'
import {
  compacto,
  fechaHora,
  formatearNumero,
  formatearPrecio,
  handleInstagram,
  linkInstagram,
  linkWhatsApp,
  porcentaje,
  tiempoRestante,
} from '../lib/format'
import { percentilTasa } from '../lib/analytics'
import type { Post } from '../lib/types'
import { Icono } from './Iconos'
import { Avatar, Modal, Nota, PortadaGenerada } from './UI'
import { Mapa } from './Mapa'
import { useApp } from '../state/contexto'

interface Props {
  post: Post | null
  alCerrar: () => void
}

export const DetalleAviso = ({ post, alCerrar }: Props) => {
  const { usuario, avisar } = useApp()
  const [contactoVisible, setContactoVisible] = useState(false)
  const [reportando, setReportando] = useState(false)
  const [motivoReporte, setMotivoReporte] = useState(MOTIVOS_REPORTE[0])
  const [detalleReporte, setDetalleReporte] = useState('')
  const [respuesta, setRespuesta] = useState('')

  // Una vista por apertura: el contador se incrementa al montar el detalle.
  useEffect(() => {
    if (!post) return
    setContactoVisible(false)
    setReportando(false)
    setRespuesta('')
    api.registrarEvento('vista', post.id, 'post')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id])

  const percentil = useMemo(
    () => (post ? percentilTasa(post, api.listarTodos()) : null),
    [post],
  )

  if (!post) return null

  const tipo = TIPOS[post.type]
  const t = tiempoRestante(post.expiraEn, post.diasVigencia)
  const esAutor = usuario?.id === post.autorId
  const esForo = post.type === 'perdido'
  const mensajeWA = `Hola ${post.contacto.nombre.split(' ')[0]}, te escribo por el aviso "${post.titulo}" que vi en la Bolsa FEUCN.`

  const verContacto = () => {
    setContactoVisible(true)
    api.registrarEvento('clic-contacto', post.id, 'post')
  }

  const compartir = async () => {
    api.registrarEvento('compartido', post.id, 'post')
    const url = `${location.origin}${location.pathname}#/aviso/${post.id}`
    try {
      if (navigator.share) await navigator.share({ title: post.titulo, url })
      else {
        await navigator.clipboard.writeText(url)
        avisar('Enlace copiado', 'ok')
      }
    } catch {
      avisar('No se pudo compartir el enlace', 'error')
    }
  }

  const enviarReporte = async () => {
    await api.reportarPost(post.id, motivoReporte, detalleReporte, usuario?.id ?? 'anonimo')
    setReportando(false)
    setDetalleReporte('')
    avisar('Reporte enviado. La moderación lo revisa hoy.', 'ok')
  }

  const responder = async () => {
    if (!respuesta.trim() || !usuario) return
    await api.responderForo(post.id, usuario.nombre, usuario.carrera, respuesta.trim())
    setRespuesta('')
    avisar('Respuesta publicada', 'ok')
  }

  const renovar = async () => {
    const r = await api.renovarPost(post.id)
    avisar(r.ok ? 'Aviso renovado por 5 días más' : (r.motivo ?? 'No se pudo renovar'), r.ok ? 'ok' : 'error')
  }

  const cerrarAviso = async () => {
    await api.archivarPost(post.id)
    avisar('Aviso cerrado. Ya no aparece en el feed.', 'ok')
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      ancho
      titulo={post.titulo}
      subtitulo={
        <span className="fila-envuelve" style={{ gap: 8 }}>
          <span className="etiqueta" style={{ color: tipo.color }}>
            <Icono nombre={post.type} tam={12} />
            {post.type === 'perdido' ? (post.lostKind === 'encontrado' ? 'Objeto encontrado' : 'Objeto perdido') : tipo.label}
          </span>
          <span className="etiqueta etiqueta-contorno">{post.categoria}</span>
          {post.estadoArticulo && <span className="etiqueta etiqueta-contorno">{post.estadoArticulo.replace('-', ' ')}</span>}
          {post.resuelto && <span className="etiqueta etiqueta-ok"><Icono nombre="visto" tam={11} />Resuelto</span>}
        </span>
      }
      pie={
        <>
          <button className="btn btn-fantasma btn-chico" onClick={() => setReportando(true)}>
            <Icono nombre="bandera" tam={15} /> Reportar
          </button>
          <button className="btn btn-chico" onClick={compartir}>
            <Icono nombre="compartir" tam={15} /> Compartir
          </button>
          {esAutor && post.status === 'expirado' && (
            <button className="btn btn-suave btn-chico" onClick={renovar}>
              <Icono nombre="refrescar" tam={15} /> Renovar 5 días
            </button>
          )}
          {esAutor && post.status === 'aprobado' && (
            <button className="btn btn-chico" onClick={cerrarAviso}>
              <Icono nombre="visto" tam={15} /> Marcar como cerrado
            </button>
          )}
        </>
      }
    >
      <div className="detalle-rejilla">
        <div className="columna" style={{ gap: 20 }}>
          <div className="detalle-galeria">
            {post.imagenes[0] ? <img src={post.imagenes[0]} alt={post.titulo} /> : <PortadaGenerada id={post.id} tipo={post.type} />}
          </div>

          {post.imagenes.length > 1 && (
            <div className="miniaturas">
              {post.imagenes.slice(1).map((src, i) => (
                <div className="miniatura" key={i}><img src={src} alt="" /></div>
              ))}
            </div>
          )}

          {post.type !== 'perdido' && (
            <div className="fila-entre">
              <span className="cifra-valor">{formatearPrecio(post.precio, post.precioNota)}</span>
              {post.precioNota && post.precio ? <span className="chico tenue">{post.precioNota}</span> : null}
            </div>
          )}

          <p className="detalle-descripcion">{post.descripcion}</p>

          {post.status === 'rechazado' && post.moderacion?.motivo && (
            <Nota tono="critico" icono="alerta">
              <strong>Rechazado por moderación.</strong> {post.moderacion.motivo}.
              {post.moderacion.nota && <> {post.moderacion.nota}</>}
            </Nota>
          )}

          <div>
            <div className="mayus tenue" style={{ marginBottom: 8 }}>Dónde se coordina</div>
            <Mapa centro={post.ubicacion.punto} zoom={16} puntos={[{ id: post.id, punto: post.ubicacion.punto, color: tipo.color, titulo: post.ubicacion.zona }]} />
            <div className="fila" style={{ marginTop: 10, gap: 8 }}>
              <Icono nombre="pin" tam={16} className="tenue" />
              <span className="chico">
                <strong>{post.ubicacion.zona}</strong> ·{' '}
                {post.ubicacion.tipo === 'campus' ? 'Campus Central UCN' : 'Fuera del campus'}
                {post.ubicacion.referencia && <span className="tenue"> — {post.ubicacion.referencia}</span>}
              </span>
            </div>
          </div>

          {esForo && (
            <div>
              <div className="mayus tenue" style={{ marginBottom: 10 }}>
                Hilo del caso ({post.respuestas?.length ?? 0})
              </div>
              <div className="hilo">
                {post.respuestas?.length ? (
                  post.respuestas.map((r) => (
                    <div className="respuesta" key={r.id}>
                      <Avatar nombre={r.autor} color="var(--serie-3)" tam="sm" />
                      <div className="respuesta-cuerpo">
                        <div className="respuesta-meta">
                          <span className="respuesta-autor">{r.autor}</span>
                          {r.carrera && <span className="mini muy-tenue">{r.carrera}</span>}
                          <span className="mini muy-tenue">· {fechaHora(r.creadoEn)}</span>
                        </div>
                        <div className="respuesta-texto">{r.mensaje}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="chico tenue">Todavía nadie responde. Si viste algo, cuéntalo: con un dato basta.</p>
                )}

                {usuario ? (
                  <div className="campo">
                    <label htmlFor="resp">Tu respuesta</label>
                    <textarea
                      id="resp"
                      className="area"
                      style={{ minHeight: 84 }}
                      placeholder="Ej: lo vi el martes cerca de la biblioteca, estaba sobre una banca."
                      value={respuesta}
                      onChange={(e) => setRespuesta(e.target.value)}
                    />
                    <div className="fila" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-primario btn-chico" onClick={responder} disabled={!respuesta.trim()}>
                        <Icono nombre="enviar" tam={15} /> Responder
                      </button>
                    </div>
                  </div>
                ) : (
                  <Nota icono="info">
                    <Link to="/entrar">Inicia sesión con tu correo UCN</Link> para responder en el hilo.
                  </Nota>
                )}

                {esAutor && !post.resuelto && (
                  <button
                    className="btn btn-ok"
                    onClick={async () => {
                      await api.marcarResuelto(post.id, true)
                      avisar('¡Caso cerrado! Gracias por avisar.', 'ok')
                    }}
                  >
                    <Icono nombre="visto" tam={16} /> Marcar como resuelto
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Columna lateral ─────────────────────────────────────────── */}
        <aside className="columna" style={{ gap: 16 }}>
          {post.status === 'aprobado' && (
            <div className="panel panel-relleno columna" style={{ gap: 9 }}>
              <div className="fila-entre">
                <span className="mayus tenue">Vigencia</span>
                <span className={`chico fuerte${t.urgente ? '' : ''}`} style={{ color: t.urgente ? 'var(--aviso-tinta)' : undefined }}>
                  {t.etiqueta}
                </span>
              </div>
              <div className={`barra-vigencia${t.urgente ? ' urgente' : ''}${t.expirado ? ' expirado' : ''}`}>
                <span style={{ width: `${Math.max(2, (1 - t.progreso) * 100)}%` }} />
              </div>
              <span className="mini muy-tenue">
                Los avisos duran {post.diasVigencia} días y se despublican solos. Vence el {fechaHora(post.expiraEn)}.
              </span>
            </div>
          )}

          {/* Contacto: se revela con un clic, y ese clic es la métrica del aviso. */}
          {contactoVisible ? (
            <div className="panel panel-relleno columna" style={{ gap: 12 }}>
              <div className="fila">
                <Avatar nombre={post.contacto.nombre} color={tipo.color} />
                <div className="crecer">
                  <div className="fuerte chico">{post.contacto.nombre}</div>
                  <div className="mini tenue">{post.contacto.carrera}</div>
                </div>
              </div>
              <div className="contacto-abierto">
                {post.contacto.whatsapp && (
                  <a className="red-pastilla" href={linkWhatsApp(post.contacto.whatsapp, mensajeWA)} target="_blank" rel="noopener noreferrer">
                    <Icono nombre="whatsapp" tam={16} /> {post.contacto.whatsapp}
                  </a>
                )}
                <a className="red-pastilla" href={`mailto:${post.contacto.correo}?subject=${encodeURIComponent(`Bolsa FEUCN — ${post.titulo}`)}`}>
                  <Icono nombre="correo" tam={16} /> {post.contacto.correo}
                </a>
                {linkInstagram(post.contacto.instagram ?? '') && (
                  <a className="red-pastilla red-ig" href={linkInstagram(post.contacto.instagram!)} target="_blank" rel="noopener noreferrer">
                    <Icono nombre="instagram" tam={16} /> {handleInstagram(post.contacto.instagram!)}
                  </a>
                )}
              </div>
              <Nota tono="aviso" icono="escudo">
                Coordinen en un punto con gente y revisa el objeto antes de cerrar el trato. <strong>La FEUCN no participa en ningún pago.</strong>
              </Nota>
            </div>
          ) : (
            <div className="contacto-oculto">
              <Icono nombre="candado" tam={20} style={{ margin: '0 auto', color: 'var(--marca-tinta)' }} />
              <div className="chico fuerte" style={{ color: 'var(--marca-tinta)' }}>
                El contacto se muestra al pulsar
              </div>
              <div className="mini" style={{ color: 'var(--marca-tinta)', opacity: 0.85 }}>
                Así el autor sabe cuánta gente se interesó de verdad.
              </div>
              <button className="btn btn-primario btn-bloque" onClick={verContacto} disabled={post.status !== 'aprobado'}>
                <Icono nombre={post.contacto.preferido === 'whatsapp' ? 'whatsapp' : 'correo'} tam={17} />
                Ver contacto
              </button>
              {post.status !== 'aprobado' && <span className="mini tenue">Este aviso ya no está activo.</span>}
            </div>
          )}

          <div className="panel panel-relleno">
            <div className="mayus tenue" style={{ marginBottom: 6 }}>Cómo va este aviso</div>
            <div className="dato"><span className="dato-lbl">Visitas</span><span className="dato-val numero">{formatearNumero(post.stats.vistas)}</span></div>
            <div className="dato"><span className="dato-lbl">Pidieron contacto</span><span className="dato-val numero">{formatearNumero(post.stats.clicsContacto)}</span></div>
            <div className="dato"><span className="dato-lbl">Tasa de contacto</span><span className="dato-val numero">{porcentaje(post.stats.clicsContacto, post.stats.vistas)}</span></div>
            <div className="dato"><span className="dato-lbl">Guardados</span><span className="dato-val numero">{formatearNumero(post.stats.guardados)}</span></div>
            {post.publicadoEn && (
              <div className="dato"><span className="dato-lbl">Publicado</span><span className="dato-val">{fechaHora(post.publicadoEn)}</span></div>
            )}
            {esAutor && percentil != null && (
              <Nota tono="ok" icono="destello">
                Tu aviso convierte mejor que el <strong>{(percentil * 100).toFixed(0)}%</strong> de los avisos de {tipo.plural.toLowerCase()}.
              </Nota>
            )}
          </div>

          <div className="panel panel-relleno">
            <div className="mayus tenue" style={{ marginBottom: 8 }}>Antes de juntarse</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 7 }}>
              {CONSEJOS_SEGURIDAD.slice(0, 3).map((c) => (
                <li key={c} className="mini tenue">{c}</li>
              ))}
            </ul>
          </div>

          <div className="mini muy-tenue centro">
            {compacto(post.stats.compartidos)} personas compartieron este aviso
          </div>
        </aside>
      </div>

      <Modal
        abierto={reportando}
        alCerrar={() => setReportando(false)}
        titulo="Reportar este aviso"
        subtitulo="Lo revisa la Comisión de Bienestar el mismo día."
        pie={
          <>
            <button className="btn btn-fantasma" onClick={() => setReportando(false)}>Cancelar</button>
            <button className="btn btn-peligro" onClick={enviarReporte}>
              <Icono nombre="bandera" tam={16} /> Enviar reporte
            </button>
          </>
        }
      >
        <div className="grupo-campos">
          <div className="campo">
            <label htmlFor="motivo">Motivo</label>
            <select id="motivo" className="selector" data-autofoco value={motivoReporte} onChange={(e) => setMotivoReporte(e.target.value)}>
              {MOTIVOS_REPORTE.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="detalle">Cuéntanos qué pasó (opcional)</label>
            <textarea
              id="detalle"
              className="area"
              style={{ minHeight: 100 }}
              value={detalleReporte}
              onChange={(e) => setDetalleReporte(e.target.value)}
              placeholder="Mientras más detalle, más rápido lo resolvemos."
            />
          </div>
        </div>
      </Modal>
    </Modal>
  )
}
