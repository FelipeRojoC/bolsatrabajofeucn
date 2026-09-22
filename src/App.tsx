import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Inicio } from './pages/Inicio'
import { EsqueletoTarjetas, Vacio } from './components/UI'

/**
 * La portada se carga con la app; el resto llega por ruta. El mapa y los
 * gráficos pesan, y nadie debería descargar el panel de moderación para ver un
 * aviso desde el celular con datos móviles.
 */
const Avisos = lazy(() => import('./pages/Avisos').then((m) => ({ default: m.Avisos })))
const Perdidos = lazy(() => import('./pages/Perdidos').then((m) => ({ default: m.Perdidos })))
const Emprendimientos = lazy(() => import('./pages/Emprendimientos').then((m) => ({ default: m.Emprendimientos })))
const Planes = lazy(() => import('./pages/Planes').then((m) => ({ default: m.Planes })))
const Publicar = lazy(() => import('./pages/Publicar').then((m) => ({ default: m.Publicar })))
const MisAvisos = lazy(() => import('./pages/MisAvisos').then((m) => ({ default: m.MisAvisos })))
const Estadisticas = lazy(() => import('./pages/Estadisticas').then((m) => ({ default: m.Estadisticas })))
const Feucn = lazy(() => import('./pages/Feucn').then((m) => ({ default: m.Feucn })))
const Moderacion = lazy(() => import('./pages/Moderacion').then((m) => ({ default: m.Moderacion })))
const Feria = lazy(() => import('./pages/Feria').then((m) => ({ default: m.Feria })))
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))
const Entrar = lazy(() => import('./pages/Entrar').then((m) => ({ default: m.Entrar })))

/** Cambiar de página vuelve arriba; sin esto se aterriza a media página. */
const AlCambiarDeRuta = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

const Cargando = () => (
  <div className="contenedor contenedor-ancho seccion">
    <div className="esqueleto" style={{ height: 34, width: '38%', marginBottom: 12 }} />
    <div className="esqueleto" style={{ height: 15, width: '62%', marginBottom: 28 }} />
    <EsqueletoTarjetas cantidad={6} />
  </div>
)

export default function App() {
  return (
    <Layout>
      <AlCambiarDeRuta />
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/avisos" element={<Avisos />} />
          <Route path="/aviso/:id" element={<Avisos />} />
          <Route path="/perdidos" element={<Perdidos />} />
          <Route path="/emprendimientos" element={<Emprendimientos />} />
          <Route path="/planes" element={<Planes />} />
          <Route path="/publicar" element={<Publicar />} />
          <Route path="/mis-avisos" element={<MisAvisos />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/feucn" element={<Feucn />} />
          <Route path="/feria" element={<Feria />} />
          <Route path="/moderacion" element={<Moderacion />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route
            path="*"
            element={
              <div className="contenedor seccion">
                <Vacio
                  icono="buscar"
                  titulo="Esta página no existe"
                  texto="Puede que el enlace esté mal escrito o que el aviso ya haya expirado."
                />
              </div>
            }
          />
        </Routes>
      </Suspense>
    </Layout>
  )
}
