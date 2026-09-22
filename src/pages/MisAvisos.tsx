import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api'
import { TIPOS } from '../lib/constants'
import { fechaHora, formatearNumero, porcentaje, tiempoRestante } from '../lib/format'
import { serieDiaria } from '../lib/analytics'
import type { Post, PostStatus } from '../lib/types'
import { TarjetaAviso } from '../components/TarjetaAviso'
import { DetalleAviso } from '../components/DetalleAviso'
import { Icono } from '../components/Iconos'
import { Nota, Vacio } from '../components/UI'
import { Chispa, Cifra } from '../components/Graficos'
import { useTic } from '../components/useTic'
import { useApp } from '../state/contexto'

const PESTANAS: { id: PostStatus | 'todos' | 'guardados'; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'aprobado', texto: 'Activos' },
  { id: 'pendiente', texto: 'En revisión' },
  { id: 'expirado', texto: 'Expirados' },
  { id: 'rechazado', texto: 'Rechazados' },
  { id: 'guardados', texto: 'Guardados' },
]

export const MisAvisos = () => {
  const { usuario, revision, avisar } = useApp()
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const [pestana, setPestana] = useState<(typeof PESTANAS)[number]['id']>('todos')
  const [abierto, setAbierto] = useState<Post | null>(null)
  useTic()

  const nuevoId = params.get('nuevo')

  const datos = useMemo(() => {
    void revision
    if (!usuario) return null
    const todos = api.listarTodos()
    const mios = todos.filter((p) => p.autorId === usuario.id)
    const guardados = api.listarGuardados()
    const eventos = api.listarEventos()
    const idsMios = new Set(mios.map((p) => p.id))

    const conteos = {
      todos: mios.length,
      aprobado: mios.filter((p) => p.status === 'aprobado').length,
      pendiente: mios.filter((p) => p.status === 'pendiente').length,
      expirado: mios.filter((p) => p.status === 'expirado').length,
      rechazado: mios.filter((p) => p.status === 'rechazado').length,
      archivado: mios.filter((p) => p.status === 'archivado').length,
      guardados: guardados.length,
    }

    const vistas = mios.reduce((a, p) => a + p.stats.vistas, 0)
    const clics = mios.reduce((a, p) => a + p.stats.clicsContacto, 0)

    return {
      mios,
      conteos,
      vistas,
      clics,
      guardadosPosts: todos.filter((p) => guardados.includes(p.id)),
      serieVistas: serieDiaria(eventos, ['vista'], 14, (e) => idsMios.has(e.targetId)).map((p) => p.valor),
      serieClics: serieDiaria(eventos, ['clic-contacto'], 14, (e) => idsMios.has(e.targetId)).map((p) => p.valor),
      porAviso: mios
        .filter((p) => p.stats.vistas > 0)
        .map((p) => ({
          post: p,
          serie: serieDiaria(eventos, ['vista'], 14, (e) => e.targetId === p.id).map((x) => x.valor),
        }))
        .sort((a, b) => b.post.stats.clicsContacto - a.post.stats.clicsContacto),
    }
  }, [usuario, revision])

  if (!usuario || !datos) {
    return (
      <div className="contenedor seccion">
        <Vacio
          icono="candado"
          titulo="Entra para ver tus avisos"
          texto="Acá aparecen los avisos que publicaste, cuánta gente los miró y cuántos pidieron tu contacto."
          accion={
            <div className="fila" style={{ justifyContent: 'center', gap: 8 }}>
              <button className="btn btn-primario" onClick={() => navegar('/entrar?volver=/mis-avisos')}>
                <Icono nombre="candado" tam={16} /> Iniciar sesión
              </button>
              <button className="btn" onClick={() => navegar('/entrar?crear=1&volver=/mis-avisos')}>Crear cuenta</button>
            </div>
          }
        />
      </div>
    )
  }

  const lista =
    pestana === 'guardados'
      ? datos.guardadosPosts
      : pestana === 'todos'
        ? datos.mios
        : datos.mios.filter((p) => p.status === pestana)

  const renovar = async (p: Post) => {
    const r = await api.renovarPost(p.id)
    avisar(r.ok ? 'Renovado por 5 días más' : (r.motivo ?? 'No se pudo renovar'), r.ok ? 'ok' : 'error')
  }

  const postAbierto = abierto ? api.obtenerPost(abierto.id) ?? abierto : null

  return (
    <>
      <div className="contenedor contenedor-ancho seccion">
        <div className="seccion-titulo">
          <div>
            <h1>Mis avisos</h1>
            <p>Cómo le está yendo a lo que publicaste y qué guardaste para después.</p>
          </div>
          <button className="btn btn-primario" onClick={() => navegar('/publicar')}>
            <Icono nombre="mas" tam={17} /> Publicar otro
          </button>
        </div>

        {nuevoId && (
          <div style={{ marginBottom: 22 }}>
            <Nota tono="ok" icono="visto">
              <strong>Aviso enviado.</strong> Queda en revisión y te llega un correo apenas se apruebe. La mediana de
              revisión hoy va en menos de una hora.
            </Nota>
          </div>
        )}

        <div className="grilla-cifras" style={{ marginBottom: 26 }}>
          <Cifra
            etiqueta="Visitas a tus avisos"
            valor={formatearNumero(datos.vistas)}
            pie="Últimos 14 días en la curva"
            chispa={datos.serieVistas}
            colorChispa="var(--serie-1)"
          />
          <Cifra
            etiqueta="Pidieron tu contacto"
            valor={formatearNumero(datos.clics)}
            pie="La métrica que de verdad importa"
            chispa={datos.serieClics}
            colorChispa="var(--serie-2)"
          />
          <Cifra
            etiqueta="Tasa de contacto"
            valor={porcentaje(datos.clics, datos.vistas)}
            pie={`${datos.conteos.aprobado} avisos activos ahora`}
          />
          <Cifra
            etiqueta="En revisión"
            valor={formatearNumero(datos.conteos.pendiente)}
            pie={datos.conteos.pendiente ? 'Te avisamos por correo' : 'Nada pendiente'}
            subirEsBueno={false}
          />
        </div>

        <div className="pestanas" role="tablist" style={{ marginBottom: 20 }}>
          {PESTANAS.map((p) => (
            <button key={p.id} className="pestana" role="tab" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}>
              {p.texto}
              <span className="pestana-cuenta">{datos.conteos[p.id as keyof typeof datos.conteos] ?? 0}</span>
            </button>
          ))}
        </div>

        {lista.length === 0 ? (
          <Vacio
            icono="archivo"
            titulo={pestana === 'guardados' ? 'No has guardado nada todavía' : 'Nada por acá'}
            texto={
              pestana === 'guardados'
                ? 'Toca el corazón de un aviso para tenerlo a mano. Se guarda solo en este navegador.'
                : 'Publica tu primer aviso y sigue acá cuánta gente lo mira y cuántos piden tu contacto.'
            }
            accion={<button className="btn btn-primario" onClick={() => navegar('/publicar')}><Icono nombre="mas" tam={16} /> Publicar aviso</button>}
          />
        ) : (
          <div className="grilla-avisos">
            {lista.map((p) => (
              <TarjetaAviso key={p.id} post={p} alAbrir={setAbierto} vistaAutor={pestana !== 'guardados'} />
            ))}
          </div>
        )}

        {pestana !== 'guardados' && datos.porAviso.length > 0 && (
          <section style={{ marginTop: 38 }}>
            <div className="seccion-titulo">
              <div>
                <h2>Rendimiento aviso por aviso</h2>
                <p>Vistas de los últimos 14 días y cuántos terminaron pidiendo tu contacto.</p>
              </div>
            </div>

            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Aviso</th>
                    <th scope="col">Tendencia</th>
                    <th scope="col" className="num">Vistas</th>
                    <th scope="col" className="num">Contactos</th>
                    <th scope="col" className="num">Tasa</th>
                    <th scope="col">Vigencia</th>
                    <th scope="col"><span className="solo-lectores">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {datos.porAviso.map(({ post, serie }) => {
                    const t = tiempoRestante(post.expiraEn, post.diasVigencia)
                    return (
                      <tr key={post.id}>
                        <th scope="row" style={{ fontWeight: 600, maxWidth: 260 }}>
                          <button
                            onClick={() => setAbierto(post)}
                            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'inherit', textAlign: 'left', font: 'inherit' }}
                          >
                            <span className="recorte-2">{post.titulo}</span>
                          </button>
                          <span className="mini muy-tenue" style={{ display: 'block', fontWeight: 400 }}>
                            {TIPOS[post.type].label} · {post.categoria}
                          </span>
                        </th>
                        <td style={{ width: 120 }}>
                          <Chispa datos={serie} color="var(--serie-1)" alto={26} />
                        </td>
                        <td className="num">{formatearNumero(post.stats.vistas)}</td>
                        <td className="num">{formatearNumero(post.stats.clicsContacto)}</td>
                        <td className="num">{porcentaje(post.stats.clicsContacto, post.stats.vistas)}</td>
                        <td>
                          {post.status === 'aprobado' ? (
                            <span className={`chico${t.urgente ? ' fuerte' : ' tenue'}`} style={t.urgente ? { color: 'var(--aviso-tinta)' } : undefined}>
                              {t.etiqueta}
                            </span>
                          ) : (
                            <span className="chico tenue">{post.status === 'expirado' ? `Venció el ${fechaHora(post.expiraEn)}` : post.status}</span>
                          )}
                        </td>
                        <td>
                          {post.status === 'expirado' && post.renovaciones === 0 && (
                            <button className="btn btn-suave btn-chico" onClick={() => renovar(post)}>
                              <Icono nombre="refrescar" tam={14} /> Renovar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="mini muy-tenue" style={{ marginTop: 10 }}>
              Un aviso con muchas visitas y pocos contactos suele tener el precio alto o falta de detalle. Si pasa al
              revés, aprovecha de renovarlo antes de que venza.
            </p>
          </section>
        )}
      </div>

      <DetalleAviso post={postAbierto} alCerrar={() => setAbierto(null)} />
    </>
  )
}
