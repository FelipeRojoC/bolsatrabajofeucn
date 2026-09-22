import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { TIPOS } from '../lib/constants'
import { compacto, formatearNumero, porcentaje } from '../lib/format'
import {
  DIAS_SEMANA,
  FRANJAS,
  agruparPorZona,
  agruparPorCategoria,
  calcularKPIs,
  mapaDeCalor,
  ranking,
  serieDiaria,
  serieDiariaPorTipo,
  variacion,
} from '../lib/analytics'
import { Cifra, Embudo, GraficoApilado, GraficoBarras, GraficoLineas, MapaCalor } from '../components/Graficos'
import { Icono } from '../components/Iconos'
import { Nota } from '../components/UI'
import { useApp } from '../state/contexto'

const RANGOS = [
  { dias: 7, texto: '7 días' },
  { dias: 14, texto: '14 días' },
  { dias: 30, texto: '30 días' },
]

export const Estadisticas = () => {
  const { revision } = useApp()
  const [dias, setDias] = useState(30)

  const d = useMemo(() => {
    void revision
    const posts = api.listarTodos()
    const eventos = api.listarEventos()
    const publicos = posts.filter((p) => p.status !== 'pendiente' && p.status !== 'rechazado')

    const vistas = serieDiaria(eventos, ['vista'], dias)
    const clics = serieDiaria(eventos, ['clic-contacto'], dias)
    const publicaciones = serieDiariaPorTipo(eventos, ['publicacion'], dias)
    const calor = mapaDeCalor(eventos, ['vista'], dias)

    const totalVistas = eventos.filter((e) => e.kind === 'vista').length
    const totalClics = eventos.filter((e) => e.kind === 'clic-contacto').length

    // Embudo sobre una misma población: los avisos, paso a paso.
    const embudo = {
      enviados: posts.length,
      publicados: posts.filter((p) => p.publicadoEn).length,
      conContacto: posts.filter((p) => p.stats.clicsContacto > 0).length,
      cerrados: posts.filter((p) => p.status === 'archivado' || p.resuelto).length,
    }

    return {
      kpis: calcularKPIs(posts, eventos),
      vistas,
      clics,
      publicaciones,
      calor,
      totalVistas,
      totalClics,
      embudo,
      categorias: agruparPorCategoria(publicos, 8),
      zonas: agruparPorZona(publicos),
      ranking: ranking(publicos, 6),
      revisados: {
        aprobados: posts.filter((p) => p.moderacion && p.status !== 'rechazado' && p.status !== 'pendiente').length,
        rechazados: posts.filter((p) => p.status === 'rechazado').length,
      },
    }
  }, [dias, revision])

  const etiquetas = d.vistas.map((p) => p.etiqueta)

  return (
    <div className="contenedor contenedor-ancho seccion">
      <div className="seccion-titulo">
        <div>
          <h1>Estadísticas de la bolsa</h1>
          <p>
            Todo lo que ves acá es público a propósito: es plata y tiempo de la federación, así que la comunidad debería
            poder revisar cómo se está usando.
          </p>
        </div>
        <div className="fila" style={{ gap: 4 }}>
          {RANGOS.map((r) => (
            <button key={r.dias} className="chip" aria-pressed={dias === r.dias} onClick={() => setDias(r.dias)}>
              {r.texto}
            </button>
          ))}
        </div>
      </div>

      {/* Cifra principal */}
      <div className="panel panel-relleno" style={{ padding: 28, marginBottom: 22 }}>
        <div className="fila-envuelve" style={{ gap: 30, alignItems: 'flex-end' }}>
          <div>
            <div className="cifra-etiqueta">Contactos facilitados desde que partió la bolsa</div>
            <div className="cifra-heroe numero">{formatearNumero(d.totalClics)}</div>
            <div className="chico tenue" style={{ marginTop: 6 }}>
              Cada uno es alguien que pidió los datos de otra persona para coordinar en persona. La plataforma no
              interviene en lo que pasa después.
            </div>
          </div>
        </div>
      </div>

      <div className="grilla-cifras" style={{ marginBottom: 22 }}>
        <Cifra
          etiqueta="Visitas a avisos"
          valor={compacto(d.kpis.vistas7d)}
          delta={variacion(d.kpis.vistas7d, d.kpis.vistasPrevias7d)}
          periodo="vs. 7 días antes"
          chispa={d.vistas.slice(-14).map((p) => p.valor)}
          colorChispa="var(--serie-1)"
        />
        <Cifra
          etiqueta="Contactos pedidos"
          valor={compacto(d.kpis.clics7d)}
          delta={variacion(d.kpis.clics7d, d.kpis.clicsPrevios7d)}
          periodo="vs. 7 días antes"
          chispa={d.clics.slice(-14).map((p) => p.valor)}
          colorChispa="var(--serie-2)"
        />
        <Cifra
          etiqueta="Tasa de contacto"
          valor={porcentaje(d.kpis.clics7d, d.kpis.vistas7d)}
          delta={variacion(d.kpis.tasaContacto, d.kpis.tasaContactoPrevia)}
          periodo="vs. 7 días antes"
          pie="De cada 100 visitas, cuántas piden contacto"
        />
        <Cifra
          etiqueta="Mediana de revisión"
          valor={`${d.kpis.tiempoMedianoRevisionMin} min`}
          subirEsBueno={false}
          pie={`${d.kpis.enCola} avisos esperando ahora`}
        />
      </div>

      <div className="grilla-avisos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
        <GraficoLineas
          titulo="Visitas y contactos"
          subtitulo={`Actividad diaria de los últimos ${dias} días`}
          etiquetas={etiquetas}
          series={[
            { nombre: 'Visitas al aviso', color: 'var(--serie-1)', valores: d.vistas.map((p) => p.valor) },
            { nombre: 'Pidieron contacto', color: 'var(--serie-2)', valores: d.clics.map((p) => p.valor) },
          ]}
        />

        <GraficoApilado
          titulo="Qué se publica cada día"
          subtitulo="Avisos aprobados, separados por tipo"
          etiquetas={d.publicaciones.map((p) => p.etiqueta)}
          series={[
            { nombre: TIPOS.trabajo.plural, color: 'var(--serie-1)', valores: d.publicaciones.map((p) => p.valores.trabajo) },
            { nombre: TIPOS.venta.plural, color: 'var(--serie-2)', valores: d.publicaciones.map((p) => p.valores.venta) },
            { nombre: 'Objetos perdidos', color: 'var(--serie-3)', valores: d.publicaciones.map((p) => p.valores.perdido) },
          ]}
        />

        <GraficoBarras
          titulo="Categorías más miradas"
          subtitulo="Visitas acumuladas por categoría"
          datos={d.categorias}
          etiquetaValor="Visitas"
          etiquetaSecundario="Contactos"
        />

        <MapaCalor
          titulo="¿Cuándo conviene publicar?"
          subtitulo="Visitas por día de la semana y franja horaria"
          filas={DIAS_SEMANA}
          columnas={FRANJAS}
          grilla={d.calor.grilla}
          max={d.calor.max}
        />

        <Embudo
          titulo="Qué le pasa a un aviso"
          subtitulo="Los mismos avisos, paso a paso desde que se envían"
          pasos={[
            { etiqueta: 'Enviados a revisión', valor: d.embudo.enviados, color: 'var(--ord-1)' },
            { etiqueta: 'Aprobados y publicados', valor: d.embudo.publicados, color: 'var(--ord-2)' },
            { etiqueta: 'Recibieron al menos un contacto', valor: d.embudo.conContacto, color: 'var(--ord-3)' },
            { etiqueta: 'Cerrados por su autor', valor: d.embudo.cerrados, color: 'var(--ord-4)' },
          ]}
        />

        <GraficoBarras
          titulo="Puntos de encuentro más usados"
          subtitulo="Dónde propone juntarse la gente"
          datos={d.zonas}
          etiquetaValor="Avisos"
          color="var(--serie-3)"
        />
      </div>

      <section style={{ marginTop: 34 }}>
        <div className="seccion-titulo">
          <div>
            <h2>Los avisos que más funcionaron</h2>
            <p>Ordenados por contactos pedidos, no por visitas: mirar es gratis, escribir no tanto.</p>
          </div>
        </div>
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Aviso</th>
                <th scope="col">Tipo</th>
                <th scope="col" className="num">Visitas</th>
                <th scope="col" className="num">Contactos</th>
                <th scope="col" className="num">Tasa</th>
              </tr>
            </thead>
            <tbody>
              {d.ranking.map((f) => (
                <tr key={f.post.id}>
                  <th scope="row" style={{ fontWeight: 600, maxWidth: 320 }}>
                    <span className="recorte-2">{f.post.titulo}</span>
                  </th>
                  <td>
                    <span className="etiqueta etiqueta-contorno">
                      <Icono nombre={f.post.type} tam={11} style={{ color: TIPOS[f.post.type].color }} />
                      {TIPOS[f.post.type].label}
                    </span>
                  </td>
                  <td className="num">{formatearNumero(f.vistas)}</td>
                  <td className="num">{formatearNumero(f.clics)}</td>
                  <td className="num">{porcentaje(f.clics, f.vistas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 34 }}>
        <div className="seccion-titulo">
          <div>
            <h2>Transparencia de la moderación</h2>
            <p>Cuánto se revisa, cuánto se rechaza y cuánto demora.</p>
          </div>
        </div>
        <div className="grilla-cifras">
          <Cifra etiqueta="Avisos aprobados" valor={formatearNumero(d.revisados.aprobados)} pie="Histórico de la plataforma" />
          <Cifra
            etiqueta="Avisos rechazados"
            valor={formatearNumero(d.revisados.rechazados)}
            subirEsBueno={false}
            pie={`${porcentaje(d.revisados.rechazados, d.revisados.aprobados + d.revisados.rechazados)} del total revisado`}
          />
          <Cifra etiqueta="Esperando revisión" valor={formatearNumero(d.kpis.enCola)} subirEsBueno={false} pie="En este momento" />
          <Cifra
            etiqueta="Casos del foro resueltos"
            valor={`${d.kpis.resueltosForo} de ${d.kpis.totalForo}`}
            pie="Objetos que volvieron a su dueño"
          />
        </div>
      </section>

      <div style={{ marginTop: 26 }}>
        <Nota icono="info">
          Las visitas se cuentan una vez por apertura del aviso y los contactos una vez por clic en "Ver contacto". No
          se guarda quién hizo cada clic: la estadística es del aviso, no de la persona.
        </Nota>
      </div>
    </div>
  )
}
