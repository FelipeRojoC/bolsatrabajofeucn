import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../state/contexto'
import * as api from '../lib/api'
import { Icono, type NombreIcono } from './Iconos'
import { Avatar, Modal } from './UI'
import { LogoFeucn } from './Logo'
import { BuscadorRapido } from './BuscadorRapido'

const NAV: { a: string; texto: string; icono: NombreIcono }[] = [
  { a: '/avisos', texto: 'Avisos', icono: 'cuadricula' },
  { a: '/perdidos', texto: '¿Se perdió esto?', icono: 'perdido' },
  { a: '/emprendimientos', texto: 'Emprendimientos', icono: 'tienda' },
  { a: '/feria', texto: 'Feria', icono: 'megafono' },
  { a: '/estadisticas', texto: 'Estadísticas', icono: 'grafico' },
  { a: '/feucn', texto: 'La FEUCN', icono: 'info' },
]

const NAV_MOVIL: { a: string; texto: string; icono: NombreIcono }[] = [
  { a: '/', texto: 'Inicio', icono: 'cuadricula' },
  { a: '/avisos', texto: 'Avisos', icono: 'venta' },
  { a: '/publicar', texto: 'Publicar', icono: 'mas' },
  { a: '/emprendimientos', texto: 'Empren.', icono: 'tienda' },
  { a: '/mis-avisos', texto: 'Yo', icono: 'usuarios' },
]

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { usuario, cambiarUsuario, esModerador, tema, ponerTema, avisar, conBackend } = useApp()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [buscador, setBuscador] = useState(false)
  const navegar = useNavigate()

  const enCola = api.listarTodos().filter((p) => p.status === 'pendiente').length
  const reportesAbiertos = api.listarReportes().filter((r) => !r.resuelto).length

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuscador(true)
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  useEffect(() => {
    if (!menuAbierto) return
    const cerrar = () => setMenuAbierto(false)
    document.addEventListener('click', cerrar)
    return () => document.removeEventListener('click', cerrar)
  }, [menuAbierto])

  const cicloTema = () => {
    const siguiente = tema === 'claro' ? 'oscuro' : tema === 'oscuro' ? 'sistema' : 'claro'
    ponerTema(siguiente)
    avisar(`Tema: ${siguiente}`)
  }

  return (
    <>
      <a className="solo-lectores" href="#principal">Saltar al contenido</a>

      <header className="cabecera">
        <div className="franja-vitral" aria-hidden="true" />
        <div className="contenedor contenedor-ancho cabecera-fila">
          <Link to="/" className="marca-logo">
            <LogoFeucn />
            <span className="marca-texto">
              Bolsa UCN
              <small>FEUCN</small>
            </span>
          </Link>

          <nav className="nav-principal" aria-label="Navegación principal">
            {NAV.map((n) => (
              <NavLink key={n.a} to={n.a} className={({ isActive }) => `nav-enlace${isActive ? ' activo' : ''}`}>
                {n.texto}
              </NavLink>
            ))}
            {esModerador && (
              <NavLink to="/moderacion" className={({ isActive }) => `nav-enlace${isActive ? ' activo' : ''}`}>
                Panel
                {enCola + reportesAbiertos > 0 && <span className="pestana-cuenta">{enCola + reportesAbiertos}</span>}
              </NavLink>
            )}
          </nav>

          <div className="crecer" />

          <button className="btn btn-fantasma btn-icono" onClick={() => setBuscador(true)} aria-label="Buscar (Ctrl K)" title="Buscar · Ctrl K">
            <Icono nombre="buscar" tam={19} />
          </button>

          <button className="btn btn-fantasma btn-icono" onClick={cicloTema} aria-label={`Tema actual: ${tema}. Cambiar tema`} title={`Tema: ${tema}`}>
            <Icono nombre={tema === 'oscuro' ? 'luna' : 'sol'} tam={19} />
          </button>

          <Link to="/publicar" className="btn btn-primario btn-chico solo-escritorio">
            <Icono nombre="mas" tam={16} /> Publicar
          </Link>

          <div className="menu-contenedor" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-fantasma"
              style={{ padding: 4, minHeight: 40, borderRadius: 999 }}
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
            >
              {usuario ? (
                <Avatar nombre={usuario.nombre} color={usuario.avatar} />
              ) : (
                <span style={{ padding: '0 10px' }}>Entrar</span>
              )}
              {usuario && <span className="solo-lectores">Menú de {usuario.nombre}</span>}
            </button>

            {menuAbierto && (
              <div className="menu" role="menu">
                {usuario ? (
                  <>
                    <div style={{ padding: '10px 11px 8px' }}>
                      <div className="fuerte chico">{usuario.nombre}</div>
                      <div className="mini tenue">{usuario.correo}</div>
                      <div className="mini muy-tenue">{usuario.carrera}</div>
                    </div>
                    <hr className="separador" />
                    <button className="menu-item" onClick={() => { navegar('/mis-avisos'); setMenuAbierto(false) }}>
                      <Icono nombre="archivo" tam={17} /> Mis avisos y estadísticas
                    </button>
                    <button className="menu-item" onClick={() => { navegar('/publicar'); setMenuAbierto(false) }}>
                      <Icono nombre="mas" tam={17} /> Publicar un aviso
                    </button>
                    {esModerador && (
                      <button className="menu-item" onClick={() => { navegar('/moderacion'); setMenuAbierto(false) }}>
                        <Icono nombre="escudo" tam={17} /> Panel de administración
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ padding: '10px 11px 6px' }} className="chico tenue">
                      Entra con tu correo UCN para publicar avisos y seguir tus estadísticas.
                    </div>
                    <button className="menu-item" onClick={() => { navegar('/entrar'); setMenuAbierto(false) }}>
                      <Icono nombre="candado" tam={17} /> Iniciar sesión
                    </button>
                    <button className="menu-item" onClick={() => { navegar('/entrar?crear=1'); setMenuAbierto(false) }}>
                      <Icono nombre="mas" tam={17} /> Crear una cuenta
                    </button>
                  </>
                )}

                <hr className="separador" />
                {!conBackend && <div className="menu-titulo">Cambiar de cuenta (demo)</div>}
                {!conBackend && api.listarUsuariosDemo().slice(0, 2).map((u) => (
                  <button
                    key={u.id}
                    className="menu-item"
                    onClick={() => { cambiarUsuario(u.id); setMenuAbierto(false); avisar(`Entraste como ${u.nombre}`, 'ok') }}
                  >
                    <Avatar nombre={u.nombre} color={u.avatar} tam="sm" />
                    <span className="crecer">
                      <span className="chico fuerte" style={{ display: 'block' }}>{u.nombre}</span>
                      <span className="mini tenue">{u.role === 'moderador' ? 'Moderación FEUCN' : 'Estudiante'}</span>
                    </span>
                    {usuario?.id === u.id && <Icono nombre="visto" tam={16} />}
                  </button>
                ))}
                {!esModerador && (
                  <button className="menu-item" onClick={() => { navegar('/admin'); setMenuAbierto(false) }}>
                    <Icono nombre="escudo" tam={17} /> Entrar al panel de la FEUCN
                  </button>
                )}
                {usuario && (
                  <button className="menu-item" onClick={() => { cambiarUsuario(null); setMenuAbierto(false); avisar('Cerraste sesión', 'ok') }}>
                    <Icono nombre="candado" tam={17} /> Cerrar sesión
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="principal" className="contenido">{children}</main>

      <footer className="pie">
        <div className="franja-vitral" aria-hidden="true" />
        <div className="contenedor contenedor-ancho">
          <div className="pie-rejilla">
            <div>
              <Link to="/" className="marca-logo" style={{ marginBottom: 12 }}>
                <LogoFeucn />
                <span className="marca-texto">Bolsa UCN<small>FEUCN</small></span>
              </Link>
              <p className="chico tenue" style={{ maxWidth: '32ch' }}>
                La bolsa de trabajo y compraventa de la comunidad UCN, administrada por la Federación de Estudiantes.
              </p>
            </div>
            <div>
              <h4>Publicar</h4>
              <div className="pie-enlaces">
                <Link to="/publicar">Publicar un aviso</Link>
                <Link to="/avisos">Ver trabajos</Link>
                <Link to="/avisos?tipo=venta">Compra y venta</Link>
                <Link to="/perdidos">Objetos perdidos</Link>
              </div>
            </div>
            <div>
              <h4>Emprender</h4>
              <div className="pie-enlaces">
                <Link to="/emprendimientos">Directorio</Link>
                <Link to="/feria">Postular a la feria</Link>
                <Link to="/planes">Planes y precios</Link>
                <Link to="/estadisticas">Estadísticas públicas</Link>
              </div>
            </div>
            <div>
              <h4>Federación</h4>
              <div className="pie-enlaces">
                <Link to="/feucn">Quiénes somos</Link>
                <Link to="/feucn#reglamento">Reglamento de la bolsa</Link>
                <Link to="/feucn#contacto">Contacto y oficina</Link>
              </div>
            </div>
          </div>

          <div className="pie-legal">
            <span>
              Proyecto de la Federación de Estudiantes UCN · Antofagasta
            </span>
            <span>Esta plataforma no procesa pagos ni participa en las transacciones.</span>
          </div>
        </div>
      </footer>

      <nav className="nav-movil" aria-label="Navegación móvil">
        {NAV_MOVIL.map((n) => (
          <NavLink key={n.a} to={n.a} end={n.a === '/'} className={({ isActive }) => (isActive ? 'activo' : '')}>
            <Icono nombre={n.icono} tam={21} />
            {n.texto}
          </NavLink>
        ))}
      </nav>

      <Modal abierto={buscador} alCerrar={() => setBuscador(false)} titulo="Buscar en la bolsa" subtitulo="Avisos, emprendimientos y secciones">
        <BuscadorRapido alNavegar={() => setBuscador(false)} />
      </Modal>
    </>
  )
}
