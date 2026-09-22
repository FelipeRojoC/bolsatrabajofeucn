import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../lib/api'
import { TIPOS } from '../lib/constants'
import { compacto, formatearNumero } from '../lib/format'
import { calcularKPIs } from '../lib/analytics'
import type { Post } from '../lib/types'
import { TarjetaAviso } from '../components/TarjetaAviso'
import { DetalleAviso } from '../components/DetalleAviso'
import { Icono } from '../components/Iconos'
import { Nota } from '../components/UI'
import { useApp } from '../state/contexto'
import { useTic } from '../components/useTic'

const PASOS = [
  {
    icono: 'mas' as const,
    titulo: 'Publicas en dos minutos',
    texto: 'Eliges el tipo, describes, marcas dónde te acomoda juntarte y listo. Sin fotos obligatorias.',
  },
  {
    icono: 'escudo' as const,
    titulo: 'Moderación lo revisa',
    texto: 'La Comisión de Bienestar aprueba o devuelve el aviso con un motivo claro. Suele tardar menos de una hora.',
  },
  {
    icono: 'reloj' as const,
    titulo: 'Vive 5 días y se va solo',
    texto: 'Nada de avisos fantasma de hace seis meses. Si sigue vigente, lo renuevas con un clic.',
  },
]

export const Inicio = () => {
  const { revision, usuario } = useApp()
  const navegar = useNavigate()
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState<Post | null>(null)
  useTic()

  const datos = useMemo(() => {
    void revision
    const todos = api.listarTodos()
    const activos = api.filtrarPosts(todos, { status: ['aprobado'] })
    return {
      kpis: calcularKPIs(todos, api.listarEventos()),
      recientes: api.filtrarPosts(todos, { tipos: ['trabajo', 'venta'], orden: 'recientes' }).slice(0, 8),
      porExpirar: api.filtrarPosts(todos, { tipos: ['trabajo', 'venta'], orden: 'por-expirar' }).slice(0, 4),
      foro: api.filtrarPosts(todos, { tipos: ['perdido'], orden: 'recientes' }).slice(0, 3),
      emprendimientos: api.listarEmprendimientos().slice(0, 3),
      totalActivos: activos.length,
      trabajos: activos.filter((p) => p.type === 'trabajo').length,
      ventas: activos.filter((p) => p.type === 'venta').length,
    }
  }, [revision])

  const postAbierto = abierto ? api.obtenerPost(abierto.id) ?? abierto : null

  const buscar = (e: React.FormEvent) => {
    e.preventDefault()
    navegar(`/avisos?q=${encodeURIComponent(q)}`)
  }

  return (
    <>
      <section className="heroe">
        <div className="contenedor contenedor-ancho heroe-inner">
          <span className="etiqueta etiqueta-marca" style={{ marginBottom: 16 }}>
            <Icono nombre="destello" tam={13} /> Proyecto de la Federación de Estudiantes UCN
          </span>

          <h1>Lo que necesitas ya lo tiene alguien de tu universidad.</h1>
          <p className="heroe-bajada">
            Trabajos, apuntes, cosas de segunda mano, objetos perdidos y los emprendimientos de tus compañeros. Sin
            pagos por la plataforma, sin comisiones: ustedes coordinan, nosotros ponemos el lugar de encuentro.
          </p>

          <form className="buscador buscador-grande" style={{ marginTop: 26, maxWidth: 560 }} onSubmit={buscar}>
            <Icono nombre="buscar" tam={20} />
            <input
              className="entrada"
              placeholder="Busca calculadora, ayudantía, bicicleta…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar en la bolsa"
            />
          </form>

          <div className="heroe-pildoras">
            {['Ayudantías', 'Libros y apuntes', 'Tecnología', 'Mudanza', 'Fotografía', 'Gratis'].map((s) => (
              <button key={s} className="chip" onClick={() => navegar(`/avisos?q=${encodeURIComponent(s)}`)}>
                {s}
              </button>
            ))}
          </div>

          <div className="heroe-acciones">
            <Link to="/publicar" className="btn btn-primario btn-grande">
              <Icono nombre="mas" tam={18} /> Publicar un aviso
            </Link>
            <Link to="/emprendimientos" className="btn btn-grande">
              <Icono nombre="tienda" tam={18} /> Ver emprendimientos
            </Link>
          </div>

          <div className="heroe-cifras">
            <div className="heroe-cifra">
              <strong className="numero">{formatearNumero(datos.totalActivos)}</strong>
              <span>avisos activos ahora</span>
            </div>
            <div className="heroe-cifra">
              <strong className="numero">{compacto(datos.kpis.vistas7d)}</strong>
              <span>visitas en 7 días</span>
            </div>
            <div className="heroe-cifra">
              <strong className="numero">{compacto(datos.kpis.clics7d)}</strong>
              <span>contactos pedidos</span>
            </div>
            <div className="heroe-cifra">
              <strong className="numero">{datos.kpis.tiempoMedianoRevisionMin} min</strong>
              <span>mediana de revisión</span>
            </div>
          </div>
        </div>
      </section>

      {/* Accesos por tipo */}
      <section className="contenedor contenedor-ancho" style={{ marginTop: -26, position: 'relative', zIndex: 2 }}>
        <div className="grilla-avisos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {(['trabajo', 'venta', 'perdido'] as const).map((t) => (
            <Link
              key={t}
              to={t === 'perdido' ? '/perdidos' : `/avisos?tipo=${t}`}
              className="panel panel-relleno"
              style={{ textDecoration: 'none', color: 'inherit', display: 'grid', gap: 8, boxShadow: 'var(--sombra-2)' }}
            >
              <span className="opcion-icono" style={{ background: `color-mix(in srgb, ${TIPOS[t].color} 14%, transparent)`, color: TIPOS[t].color }}>
                <Icono nombre={t} tam={20} />
              </span>
              <span className="fuerte">{TIPOS[t].plural}</span>
              <span className="chico tenue">{TIPOS[t].descripcion}</span>
              <span className="chico fuerte" style={{ color: 'var(--marca)' }}>
                {t === 'trabajo' ? `${datos.trabajos} avisos` : t === 'venta' ? `${datos.ventas} avisos` : `${datos.kpis.totalForo} casos`}
                <Icono nombre="chevron" tam={13} style={{ verticalAlign: '-2px', marginLeft: 3 }} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Por expirar */}
      {datos.porExpirar.length > 0 && (
        <section className="contenedor contenedor-ancho seccion">
          <div className="seccion-titulo">
            <div>
              <h2>Están por vencer</h2>
              <p>Avisos a los que les quedan horas. Si te sirve alguno, escribe hoy.</p>
            </div>
            <Link to="/avisos?orden=por-expirar" className="btn btn-chico">Ver todos</Link>
          </div>
          <div className="grilla-avisos">
            {datos.porExpirar.map((p) => (
              <TarjetaAviso key={p.id} post={p} alAbrir={setAbierto} />
            ))}
          </div>
        </section>
      )}

      {/* Recientes */}
      <section className="contenedor contenedor-ancho seccion" style={{ paddingTop: 0 }}>
        <div className="seccion-titulo">
          <div>
            <h2>Recién publicados</h2>
            <p>Lo último que subió la comunidad, ya revisado por moderación.</p>
          </div>
          <Link to="/avisos" className="btn btn-chico">Ver el feed completo</Link>
        </div>
        <div className="grilla-avisos">
          {datos.recientes.map((p) => (
            <TarjetaAviso key={p.id} post={p} alAbrir={setAbierto} />
          ))}
        </div>
      </section>

      {/* Foro */}
      <section style={{ background: 'var(--superficie)', borderBlock: '1px solid var(--borde)' }}>
        <div className="contenedor contenedor-ancho seccion">
          <div className="seccion-titulo">
            <div>
              <h2>¿Se perdió esto?</h2>
              <p>
                El foro de objetos perdidos y encontrados del campus. {datos.kpis.resueltosForo} de {datos.kpis.totalForo}{' '}
                casos publicados terminaron con el objeto de vuelta.
              </p>
            </div>
            <Link to="/perdidos" className="btn btn-chico">Entrar al foro</Link>
          </div>
          <div className="grilla-avisos">
            {datos.foro.map((p) => (
              <TarjetaAviso key={p.id} post={p} alAbrir={setAbierto} />
            ))}
          </div>
        </div>
      </section>

      {/* Emprendimientos */}
      <section className="contenedor contenedor-ancho seccion">
        <div className="seccion-titulo">
          <div>
            <h2>Emprendimientos UCN</h2>
            <p>Negocios llevados por estudiantes. El directorio se financia con los planes mensuales, y eso mantiene la plataforma en pie.</p>
          </div>
          <Link to="/emprendimientos" className="btn btn-chico">Ver el directorio</Link>
        </div>
        <div className="grilla-emp">
          {datos.emprendimientos.map((e) => (
            <Link key={e.id} to={`/emprendimientos?abrir=${e.id}`} className="emp-tarjeta" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="fila">
                <span className="emp-logo" style={{ background: e.logo }}>{e.nombre.slice(0, 2).toUpperCase()}</span>
                <div className="crecer">
                  <div className="fuerte">{e.nombre}</div>
                  <div className="mini tenue">{e.rubro}</div>
                </div>
                {e.plan === 'pro' && <span className="etiqueta etiqueta-marca"><Icono nombre="estrella" tam={11} />Pro</span>}
              </div>
              <p className="chico tenue recorte-3" style={{ margin: 0 }}>{e.lema}</p>
              {e.instagram && (
                <span className="mini muy-tenue fila" style={{ gap: 5 }}>
                  <Icono nombre="instagram" tam={13} /> @{e.instagram}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section style={{ background: 'var(--superficie)', borderBlock: '1px solid var(--borde)' }}>
        <div className="contenedor contenedor-ancho seccion">
          <div className="seccion-titulo">
            <div>
              <h2>Cómo funciona</h2>
              <p>Tres reglas simples que mantienen la bolsa usable.</p>
            </div>
          </div>
          <div className="grilla-avisos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            {PASOS.map((p, i) => (
              <div key={p.titulo} className="panel panel-relleno columna" style={{ gap: 10 }}>
                <div className="fila">
                  <span className="paso-num activo" style={{ background: 'var(--marca)', color: '#fff' }}>{i + 1}</span>
                  <Icono nombre={p.icono} tam={19} className="tenue" />
                </div>
                <h3 style={{ fontSize: '1rem' }}>{p.titulo}</h3>
                <p className="chico tenue" style={{ margin: 0 }}>{p.texto}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22 }}>
            <Nota tono="marca" icono="escudo">
              <strong>Acá no se paga nada por la plataforma.</strong> No hay carrito, ni comisión, ni transferencias
              dentro del sitio: el trato lo cierran ustedes en persona. Si alguien te pide dinero a nombre de la FEUCN,
              repórtalo.
            </Nota>
          </div>
        </div>
      </section>

      {!usuario && (
        <section className="contenedor contenedor-ancho seccion">
          <div className="panel panel-relleno centro" style={{ padding: 36 }}>
            <h2>¿Tienes algo que ofrecer?</h2>
            <p className="tenue" style={{ maxWidth: '52ch', margin: '10px auto 22px' }}>
              Entra con tu correo institucional y publica en un par de minutos. Cualquier estudiante de la UCN puede.
            </p>
            <Link to="/publicar" className="btn btn-primario btn-grande">
              <Icono nombre="mas" tam={18} /> Publicar mi primer aviso
            </Link>
          </div>
        </section>
      )}

      <DetalleAviso post={postAbierto} alCerrar={() => setAbierto(null)} />
    </>
  )
}
