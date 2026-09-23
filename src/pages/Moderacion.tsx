import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { MOTIVOS_RECHAZO, PLANES, TIPOS } from '../lib/constants'
import { fechaHora, formatearNumero, formatearPrecio, hace, porcentaje } from '../lib/format'
import { calcularKPIs, serieDiaria } from '../lib/analytics'
import type { Post, Report, SolicitudPlan } from '../lib/types'
import { Icono } from '../components/Iconos'
import { Avatar, Modal, Nota, Vacio } from '../components/UI'
import { Cifra, GraficoLineas, Medidor } from '../components/Graficos'
import { DetalleAviso } from '../components/DetalleAviso'
import { PanelFerias } from '../components/PanelFerias'
import { IngresoPanel } from '../components/IngresoPanel'
import { PanelCuentas } from '../components/PanelCuentas'
import { PanelEmprendimientos } from '../components/PanelEmprendimientos'
import { useApp } from '../state/contexto'

type Pestana = 'cola' | 'reportes' | 'emprendimientos' | 'suscripciones' | 'ferias' | 'cuentas' | 'actividad'

export const Moderacion = () => {
  const { usuario, esModerador, esAdmin, revision, avisar } = useApp()
  const [pestana, setPestana] = useState<Pestana>('cola')
  const [rechazando, setRechazando] = useState<Post | null>(null)
  const [motivo, setMotivo] = useState(MOTIVOS_RECHAZO[0])
  const [nota, setNota] = useState('')
  const [previsualizando, setPrevisualizando] = useState<Post | null>(null)

  const d = useMemo(() => {
    void revision
    const posts = api.listarTodos()
    const eventos = api.listarEventos()
    const reportes = api.listarReportes()
    return {
      posts,
      cola: posts.filter((p) => p.status === 'pendiente').sort((a, b) => b.riesgo - a.riesgo),
      reportes: reportes.filter((r) => !r.resuelto),
      empsPendientes: api.listarEmprendimientos(false).filter((e) => e.status === 'pendiente'),
      solicitudes: api.listarSolicitudes().filter((s) => s.status === 'pendiente'),
      kpis: calcularKPIs(posts, eventos),
      seriePublicaciones: serieDiaria(eventos, ['publicacion'], 30),
      serieReportes: serieDiaria(
        reportes.map((r) => ({ id: r.id, kind: 'vista' as const, targetId: r.postId, targetType: 'post' as const, at: r.creadoEn })),
        ['vista'],
        30,
      ),
      rechazados: posts.filter((p) => p.status === 'rechazado'),
    }
  }, [revision])

  // Sin sesión de equipo, esta misma dirección muestra el formulario: no hay
  // una ruta de ingreso aparte que delate dónde está el panel.
  if (!esModerador) return <IngresoPanel />

  const aprobar = async (p: Post) => {
    await api.moderarPost(p.id, 'aprobar', { revisadoPor: usuario!.nombre })
    avisar(`"${p.titulo.slice(0, 32)}…" publicado`, 'ok')
  }

  const confirmarRechazo = async () => {
    if (!rechazando) return
    await api.moderarPost(rechazando.id, 'rechazar', { revisadoPor: usuario!.nombre, motivo, nota: nota.trim() || undefined })
    avisar('Aviso rechazado con motivo', 'ok')
    setRechazando(null)
    setNota('')
  }

  const PESTANAS: { id: Pestana; texto: string; cuenta?: number }[] = [
    { id: 'cola', texto: 'Cola de avisos', cuenta: d.cola.length },
    { id: 'reportes', texto: 'Reportes', cuenta: d.reportes.length },
    { id: 'emprendimientos', texto: 'Emprendimientos', cuenta: d.empsPendientes.length },
    { id: 'suscripciones', texto: 'Suscripciones', cuenta: d.solicitudes.length },
    { id: 'ferias', texto: 'Ferias' },
    // Suspender y eliminar cuentas es decisión de la mesa directiva, no de
    // quien modera avisos: la pestaña solo existe para el rol admin.
    ...(esAdmin ? [{ id: 'cuentas' as const, texto: 'Cuentas' }] : []),
    { id: 'actividad', texto: 'Actividad' },
  ]

  return (
    <>
      <div className="contenedor contenedor-ancho seccion">
        <div className="seccion-titulo">
          <div>
            <h1>{esAdmin ? 'Panel de administración' : 'Panel de moderación'}</h1>
            <p>
              Cola ordenada por riesgo automático: lo más sospechoso arriba. Cada decisión queda registrada con tu
              nombre y el motivo.
            </p>
          </div>
          <div className="fila" style={{ gap: 8 }}>
            <button
              className="btn btn-chico"
              onClick={() => {
                const blob = new Blob([api.exportarDatos()], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `bolsa-feucn-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(url)
                avisar('Datos exportados', 'ok')
              }}
            >
              <Icono nombre="descargar" tam={15} /> Exportar datos
            </button>
          </div>
        </div>

        <div className="grilla-cifras" style={{ marginBottom: 26 }}>
          <Cifra etiqueta="Esperando revisión" valor={formatearNumero(d.cola.length)} subirEsBueno={false} pie={d.cola.length ? `El más antiguo: ${hace(d.cola[d.cola.length - 1].creadoEn)}` : 'Cola vacía'} />
          <Cifra etiqueta="Reportes abiertos" valor={formatearNumero(d.reportes.length)} subirEsBueno={false} pie="De la comunidad" />
          <Cifra etiqueta="Mediana de revisión" valor={`${d.kpis.tiempoMedianoRevisionMin} min`} subirEsBueno={false} pie="Desde el envío hasta la decisión" />
          <Cifra
            etiqueta="Tasa de rechazo"
            valor={porcentaje(d.rechazados.length, d.rechazados.length + d.posts.filter((p) => p.moderacion && p.status !== 'rechazado').length)}
            subirEsBueno={false}
            pie="Histórico"
          />
        </div>

        <div className="pestanas" role="tablist" style={{ marginBottom: 22 }}>
          {PESTANAS.map((p) => (
            <button key={p.id} className="pestana" role="tab" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}>
              {p.texto}
              {p.cuenta !== undefined && <span className="pestana-cuenta">{p.cuenta}</span>}
            </button>
          ))}
        </div>

        {/* ── Cola ──────────────────────────────────────────────────── */}
        {pestana === 'cola' && (
          d.cola.length === 0 ? (
            <Vacio icono="visto" titulo="Cola limpia" texto="No hay avisos esperando revisión. Buen trabajo." />
          ) : (
            <div className="cola">
              {d.cola.map((p) => (
                <article key={p.id} className={`cola-item riesgo-${p.riesgo >= 60 ? 'alto' : p.riesgo >= 30 ? 'medio' : 'bajo'}`}>
                  <div className="columna" style={{ gap: 11 }}>
                    <div className="fila-envuelve" style={{ gap: 7 }}>
                      <span className="etiqueta" style={{ color: TIPOS[p.type].color }}>
                        <Icono nombre={p.type} tam={11} /> {TIPOS[p.type].label}
                      </span>
                      <span className="etiqueta etiqueta-contorno">{p.categoria}</span>
                      {p.precio !== undefined && <span className="etiqueta etiqueta-contorno">{formatearPrecio(p.precio, p.precioNota)}</span>}
                      <span className="mini muy-tenue">Enviado {hace(p.creadoEn)}</span>
                    </div>

                    <h3 style={{ fontSize: '1.02rem' }}>{p.titulo}</h3>
                    <p className="chico tenue recorte-3" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{p.descripcion}</p>

                    <div className="fila" style={{ gap: 9 }}>
                      <Avatar nombre={p.contacto.nombre} color="var(--serie-6)" tam="sm" />
                      <span className="mini tenue">
                        {p.contacto.nombre} · {p.contacto.carrera} · {p.contacto.correo}
                      </span>
                    </div>

                    <div className="mini muy-tenue fila" style={{ gap: 6 }}>
                      <Icono nombre="pin" tam={13} /> {p.ubicacion.zona}{p.ubicacion.tipo === 'fuera' ? ' · fuera del campus' : ''}
                    </div>

                    {p.banderas.length > 0 && (
                      <div className="banderas">
                        {p.banderas.map((b) => (
                          <span key={b} className="etiqueta etiqueta-serio"><Icono nombre="alerta" tam={11} />{b}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="cola-acciones">
                    <Medidor valor={p.riesgo} />
                    <button className="btn btn-ok btn-bloque" onClick={() => aprobar(p)}>
                      <Icono nombre="visto" tam={16} /> Aprobar y publicar
                    </button>
                    <button className="btn btn-peligro btn-bloque" onClick={() => { setRechazando(p); setMotivo(MOTIVOS_RECHAZO[0]) }}>
                      <Icono nombre="cerrar" tam={16} /> Rechazar
                    </button>
                    <button className="btn btn-fantasma btn-bloque btn-chico" onClick={() => setPrevisualizando(p)}>
                      <Icono nombre="ojo" tam={15} /> Ver como lo vería el público
                    </button>
                    <span className="mini muy-tenue centro">
                      Al aprobar, el aviso vive {p.diasVigencia} días
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )
        )}

        {/* ── Reportes ──────────────────────────────────────────────── */}
        {pestana === 'reportes' && (
          d.reportes.length === 0 ? (
            <Vacio icono="bandera" titulo="Sin reportes abiertos" texto="La comunidad no ha marcado nada pendiente." />
          ) : (
            <div className="cola">
              {d.reportes.map((r) => (
                <FilaReporte key={r.id} reporte={r} alVer={setPrevisualizando} alResolver={async () => {
                  await api.resolverReporte(r.id)
                  avisar('Reporte marcado como resuelto', 'ok')
                }} />
              ))}
            </div>
          )
        )}

        {/* ── Emprendimientos ───────────────────────────────────────── */}
        {pestana === 'emprendimientos' && <PanelEmprendimientos />}

        {/* ── Suscripciones ─────────────────────────────────────────── */}
        {pestana === 'suscripciones' && (
          <>
            <Nota tono="marca" icono="tarjeta">
              El pago se coordina y se recibe fuera de la plataforma. Confirma una solicitud solo cuando el comprobante
              esté en tesorería: al confirmarla, el plan se activa de inmediato.
            </Nota>
            <div style={{ height: 18 }} />
            {d.solicitudes.length === 0 ? (
              <Vacio icono="tarjeta" titulo="Sin solicitudes pendientes" texto="Todas las suscripciones están al día." />
            ) : (
              <div className="cola">
                {d.solicitudes.map((s) => (
                  <FilaSolicitud key={s.id} solicitud={s} alDecidir={async (accion) => {
                    await api.resolverSolicitud(s.id, accion, accion === 'confirmar' ? 'Pago verificado en tesorería FEUCN.' : undefined)
                    avisar(accion === 'confirmar' ? 'Plan activado' : 'Solicitud rechazada', 'ok')
                  }} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Ferias ────────────────────────────────────────────────── */}
        {pestana === 'ferias' && <PanelFerias />}

        {/* ── Cuentas ───────────────────────────────────────────────── */}
        {pestana === 'cuentas' && esAdmin && <PanelCuentas />}

        {/* ── Actividad ─────────────────────────────────────────────── */}
        {pestana === 'actividad' && (
          <div className="grilla-avisos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
            <GraficoLineas
              titulo="Avisos publicados por día"
              subtitulo="Últimos 30 días, después de aprobación"
              etiquetas={d.seriePublicaciones.map((p) => p.etiqueta)}
              series={[{ nombre: 'Publicados', color: 'var(--serie-1)', valores: d.seriePublicaciones.map((p) => p.valor) }]}
            />
            <GraficoLineas
              titulo="Reportes recibidos"
              subtitulo="Cuánto marca la comunidad cada día"
              etiquetas={d.serieReportes.map((p) => p.etiqueta)}
              series={[{ nombre: 'Reportes', color: 'var(--serie-2)', valores: d.serieReportes.map((p) => p.valor) }]}
            />

            <div className="viz" style={{ gridColumn: '1 / -1' }}>
              <div className="viz-cabecera">
                <div>
                  <div className="viz-titulo">Últimas decisiones</div>
                  <div className="viz-sub">Registro de moderación, con motivo y responsable</div>
                </div>
              </div>
              <div className="tabla-envoltura" style={{ border: 0 }}>
                <table className="tabla">
                  <thead>
                    <tr>
                      <th scope="col">Aviso</th>
                      <th scope="col">Decisión</th>
                      <th scope="col">Motivo</th>
                      <th scope="col">Quién</th>
                      <th scope="col">Cuándo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.posts
                      .filter((p) => p.moderacion)
                      .sort((a, b) => b.moderacion!.revisadoEn.localeCompare(a.moderacion!.revisadoEn))
                      .slice(0, 10)
                      .map((p) => (
                        <tr key={p.id}>
                          <th scope="row" style={{ fontWeight: 600, maxWidth: 280 }}>
                            <span className="recorte-2">{p.titulo}</span>
                          </th>
                          <td>
                            <span className={`etiqueta ${p.status === 'rechazado' ? 'etiqueta-critico' : 'etiqueta-ok'}`}>
                              {p.status === 'rechazado' ? 'Rechazado' : 'Aprobado'}
                            </span>
                          </td>
                          <td className="chico tenue">{p.moderacion?.motivo ?? '—'}</td>
                          <td className="chico tenue">{p.moderacion?.revisadoPor}</td>
                          <td className="chico tenue">{fechaHora(p.moderacion!.revisadoEn)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rechazo con motivo obligatorio */}
      <Modal
        abierto={Boolean(rechazando)}
        alCerrar={() => setRechazando(null)}
        titulo="Rechazar aviso"
        subtitulo={rechazando?.titulo}
        pie={
          <>
            <button className="btn btn-fantasma" onClick={() => setRechazando(null)}>Cancelar</button>
            <button className="btn btn-peligro" onClick={confirmarRechazo}>
              <Icono nombre="cerrar" tam={16} /> Rechazar y avisar al autor
            </button>
          </>
        }
      >
        <div className="grupo-campos">
          <Nota icono="info">
            El autor recibe el motivo por correo y puede corregir y volver a enviarlo. Sé específico: ahorra una segunda
            vuelta.
          </Nota>
          <div className="campo">
            <label htmlFor="mot">Motivo</label>
            <select id="mot" className="selector" data-autofoco value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              {MOTIVOS_RECHAZO.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="notamod">Nota para el autor (opcional)</label>
            <textarea id="notamod" className="area" style={{ minHeight: 96 }} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué tendría que cambiar para que se apruebe." />
          </div>
        </div>
      </Modal>

      <DetalleAviso post={previsualizando} alCerrar={() => setPrevisualizando(null)} />
    </>
  )
}

/* ── Filas auxiliares ──────────────────────────────────────────────────── */

const FilaReporte = ({ reporte, alVer, alResolver }: { reporte: Report; alVer: (p: Post) => void; alResolver: () => void }) => {
  const post = api.obtenerPost(reporte.postId)
  return (
    <article className="cola-item riesgo-medio">
      <div className="columna" style={{ gap: 10 }}>
        <div className="fila-envuelve" style={{ gap: 7 }}>
          <span className="etiqueta etiqueta-critico"><Icono nombre="bandera" tam={11} />{reporte.motivo}</span>
          <span className="mini muy-tenue">Reportado {hace(reporte.creadoEn)}</span>
        </div>
        <h3 style={{ fontSize: '1rem' }}>{post?.titulo ?? 'Aviso eliminado'}</h3>
        {reporte.detalle && <p className="chico tenue" style={{ margin: 0 }}>“{reporte.detalle}”</p>}
        {post && (
          <div className="mini muy-tenue">
            {post.contacto.nombre} · {post.stats.vistas} visitas · {post.stats.clicsContacto} contactos
          </div>
        )}
      </div>
      <div className="cola-acciones">
        {post && (
          <>
            <button className="btn btn-bloque btn-chico" onClick={() => alVer(post)}>
              <Icono nombre="ojo" tam={15} /> Ver el aviso
            </button>
            <button
              className="btn btn-peligro btn-bloque btn-chico"
              onClick={async () => {
                await api.moderarPost(post.id, 'rechazar', { revisadoPor: 'Moderación FEUCN', motivo: reporte.motivo, nota: 'Retirado tras un reporte de la comunidad.' })
                alResolver()
              }}
            >
              <Icono nombre="cerrar" tam={15} /> Bajar el aviso
            </button>
          </>
        )}
        <button className="btn btn-fantasma btn-bloque btn-chico" onClick={alResolver}>
          Descartar reporte
        </button>
      </div>
    </article>
  )
}

const FilaSolicitud = ({ solicitud, alDecidir }: { solicitud: SolicitudPlan; alDecidir: (a: 'confirmar' | 'rechazar') => void }) => {
  const plan = PLANES.find((p) => p.id === solicitud.plan)!
  return (
    <article className="cola-item riesgo-bajo">
      <div className="columna" style={{ gap: 9 }}>
        <div className="fila-envuelve" style={{ gap: 7 }}>
          <span className="etiqueta etiqueta-marca"><Icono nombre="tarjeta" tam={11} />Plan {plan.nombre}</span>
          <span className="etiqueta etiqueta-contorno">{solicitud.meses} {solicitud.meses === 1 ? 'mes' : 'meses'}</span>
          <span className="mini muy-tenue">Solicitado {hace(solicitud.creadoEn)}</span>
        </div>
        <h3 style={{ fontSize: '1rem' }}>{solicitud.emprendimiento}</h3>
        <div className="mini tenue">{solicitud.solicitante} · {solicitud.correo}</div>
        <div className="chico">
          Total a cobrar por tesorería: <strong>{formatearPrecio(plan.precioMensual * solicitud.meses)}</strong>
        </div>
      </div>
      <div className="cola-acciones">
        <button className="btn btn-ok btn-bloque" onClick={() => alDecidir('confirmar')}>
          <Icono nombre="visto" tam={16} /> Confirmar pago recibido
        </button>
        <button className="btn btn-peligro btn-bloque btn-chico" onClick={() => alDecidir('rechazar')}>
          Rechazar solicitud
        </button>
        <span className="mini muy-tenue centro">El cobro se hace fuera de la plataforma</span>
      </div>
    </article>
  )
}
