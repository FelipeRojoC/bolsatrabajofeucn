import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import { PLANES } from '../lib/constants'
import { formatearNumero, formatearPrecio } from '../lib/format'
import { GraficoBarras } from '../components/Graficos'
import { Icono } from '../components/Iconos'
import { Nota } from '../components/UI'
import { useApp } from '../state/contexto'

const COMPARATIVA: { fila: string; vitrina: string | boolean; emprendedor: string | boolean; pro: string | boolean }[] = [
  { fila: 'Ficha en el directorio', vitrina: true, emprendedor: true, pro: true },
  { fila: 'Caracteres de descripción', vitrina: '280', emprendedor: '1.200', pro: '3.000' },
  { fila: 'Enlace a Instagram', vitrina: true, emprendedor: true, pro: true },
  { fila: 'TikTok y sitio web', vitrina: false, emprendedor: true, pro: true },
  { fila: 'Catálogo de productos', vitrina: false, emprendedor: 'Hasta 6', pro: 'Ilimitado' },
  { fila: 'Foto de portada y galería', vitrina: false, emprendedor: true, pro: true },
  { fila: 'Estadísticas de la ficha', vitrina: 'Solo vistas', emprendedor: 'Vistas y clics por canal', pro: 'Completas + reporte mensual' },
  { fila: 'Posición en el directorio', vitrina: 'Estándar', emprendedor: 'Media', pro: 'Destacado fijo' },
  { fila: 'Difusión en redes FEUCN', vitrina: false, emprendedor: false, pro: '1 vez al mes' },
]

const DESTINO_FONDOS = [
  { clave: 'Servidor y dominio', valor: 42 },
  { clave: 'Desarrollo y mantención', valor: 31 },
  { clave: 'Moderación y soporte', valor: 18 },
  { clave: 'Fondo de mejoras', valor: 9 },
]

const PREGUNTAS = [
  {
    q: '¿Publicar avisos también se paga?',
    a: 'No. Publicar trabajos, ventas y casos del foro es gratis para toda la comunidad UCN, y va a seguir siéndolo. El plan mensual es solo para la ficha extendida del directorio de emprendimientos.',
  },
  {
    q: '¿La plataforma cobra o procesa el pago?',
    a: 'No. Cuando eliges un plan se genera una solicitud y tesorería FEUCN te escribe para coordinar el pago por los canales oficiales de la federación. Acá no hay pasarela de pago, ni tarjeta, ni comisión.',
  },
  {
    q: '¿Qué pasa si dejo de pagar?',
    a: 'Tu ficha no se borra: vuelve al plan Vitrina. Mantienes tu nombre, tu rubro y tu Instagram, y pierdes el catálogo y el destacado hasta que renueves.',
  },
  {
    q: '¿Puedo cambiar de plan a mitad de camino?',
    a: 'Sí. Se te descuenta lo que llevas pagado del plan anterior y pagas solo la diferencia proporcional.',
  },
  {
    q: '¿Quién decide en qué se gasta la plata?',
    a: 'La asamblea. Cada semestre se presenta la rendición de cuentas de esta sección junto con el resto del presupuesto de la federación.',
  },
]

const Marca = ({ valor }: { valor: string | boolean }) =>
  typeof valor === 'boolean' ? (
    valor ? (
      <Icono nombre="visto" tam={17} style={{ color: 'var(--ok)' }} aria-label="Incluido" />
    ) : (
      <span className="muy-tenue" aria-label="No incluido">—</span>
    )
  ) : (
    <span className="chico">{valor}</span>
  )

export const Planes = () => {
  const { revision } = useApp()

  const resumen = useMemo(() => {
    void revision
    const emps = api.listarEmprendimientos()
    const pagados = emps.filter((e) => e.plan !== 'vitrina')
    return {
      total: emps.length,
      pagados: pagados.length,
      ingresoMensual: pagados.reduce((a, e) => a + (PLANES.find((p) => p.id === e.plan)?.precioMensual ?? 0), 0),
      vistasDirectorio: emps.reduce((a, e) => a + e.stats.vistas, 0),
    }
  }, [revision])

  return (
    <div className="contenedor contenedor-ancho seccion">
      <div className="centro" style={{ maxWidth: 620, margin: '0 auto 40px' }}>
        <span className="etiqueta etiqueta-marca" style={{ marginBottom: 14 }}>
          <Icono nombre="tienda" tam={13} /> Solo para emprendimientos
        </span>
        <h1>Planes del directorio</h1>
        <p className="tenue" style={{ marginTop: 12 }}>
          Publicar avisos es gratis. Lo que se paga acá es la ficha extendida de un emprendimiento en el directorio, y
          es lo que mantiene funcionando toda la plataforma.
        </p>
      </div>

      <div className="grilla-planes" style={{ marginBottom: 40 }}>
        {PLANES.map((p) => (
          <div key={p.id} className={`plan${p.destacado ? ' destacado' : ''}`}>
            {p.destacado && <span className="plan-cinta">El más elegido</span>}
            <div>
              <h3>{p.nombre}</h3>
              <p className="chico tenue" style={{ marginTop: 6, minHeight: '3em' }}>{p.descripcion}</p>
            </div>
            <div className="plan-precio">
              {p.precioMensual === 0 ? 'Gratis' : formatearPrecio(p.precioMensual)}
              {p.precioMensual > 0 && <small> / mes</small>}
            </div>
            <ul className="plan-lista">
              {p.beneficios.map((b) => (
                <li key={b}>
                  <Icono nombre="visto" tam={15} />
                  {b}
                </li>
              ))}
            </ul>
            <Link to="/emprendimientos" className={`btn btn-bloque${p.destacado ? ' btn-primario' : ''}`} style={{ marginTop: 'auto' }}>
              {p.precioMensual === 0 ? 'Registrar gratis' : `Solicitar plan ${p.nombre}`}
            </Link>
          </div>
        ))}
      </div>

      <Nota tono="marca" icono="escudo">
        <strong>Nadie paga dentro del sitio.</strong> Al elegir un plan se genera una solicitud; tesorería FEUCN te
        contacta y el pago se hace por los canales oficiales de la federación. La plataforma no guarda datos bancarios
        ni tiene pasarela de pago.
      </Nota>

      {/* Comparativa */}
      <section style={{ marginTop: 44 }}>
        <div className="seccion-titulo">
          <div>
            <h2>Qué incluye cada plan</h2>
          </div>
        </div>
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Característica</th>
                {PLANES.map((p) => (
                  <th key={p.id} scope="col" style={{ textAlign: 'center' }}>
                    {p.nombre}
                    <span style={{ display: 'block', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '0.75rem', color: 'var(--tinta-3)' }}>
                      {p.precioMensual === 0 ? 'Gratis' : `${formatearPrecio(p.precioMensual)}/mes`}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARATIVA.map((f) => (
                <tr key={f.fila}>
                  <th scope="row" style={{ fontWeight: 600 }}>{f.fila}</th>
                  <td style={{ textAlign: 'center' }}><Marca valor={f.vitrina} /></td>
                  <td style={{ textAlign: 'center' }}><Marca valor={f.emprendedor} /></td>
                  <td style={{ textAlign: 'center' }}><Marca valor={f.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transparencia */}
      <section style={{ marginTop: 44 }}>
        <div className="seccion-titulo">
          <div>
            <h2>En qué se va la plata</h2>
            <p>Distribución del presupuesto de la plataforma, aprobada en asamblea.</p>
          </div>
        </div>
        <div className="grilla-avisos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          <GraficoBarras
            titulo="Destino de los fondos"
            subtitulo="Porcentaje del ingreso mensual del directorio"
            datos={DESTINO_FONDOS}
            etiquetaValor="Porcentaje"
            formato={(v) => `${v}%`}
          />
          <div className="viz">
            <div className="viz-cabecera">
              <div>
                <div className="viz-titulo">El directorio hoy</div>
                <div className="viz-sub">Estado actual de la sección</div>
              </div>
            </div>
            <div className="columna" style={{ gap: 0 }}>
              <div className="dato"><span className="dato-lbl crecer">Emprendimientos publicados</span><span className="dato-val numero">{resumen.total}</span></div>
              <div className="dato"><span className="dato-lbl crecer">Con plan pagado</span><span className="dato-val numero">{resumen.pagados}</span></div>
              <div className="dato"><span className="dato-lbl crecer">Ingreso mensual estimado</span><span className="dato-val numero">{formatearPrecio(resumen.ingresoMensual)}</span></div>
              <div className="dato"><span className="dato-lbl crecer">Visitas al directorio</span><span className="dato-val numero">{formatearNumero(resumen.vistasDirectorio)}</span></div>
            </div>
            <p className="mini muy-tenue" style={{ margin: 0 }}>
              Si el ingreso supera el costo de operación, el excedente va al fondo de mejoras de la plataforma.
            </p>
          </div>
        </div>
      </section>

      {/* Preguntas */}
      <section style={{ marginTop: 44, maxWidth: 760 }}>
        <div className="seccion-titulo">
          <div>
            <h2>Preguntas frecuentes</h2>
          </div>
        </div>
        {PREGUNTAS.map((p) => (
          <details className="acordeon" key={p.q}>
            <summary>{p.q}</summary>
            <div className="acordeon-cuerpo">{p.a}</div>
          </details>
        ))}
      </section>

      <div className="panel panel-relleno centro" style={{ padding: 36, marginTop: 44 }}>
        <h2>¿Tienes un emprendimiento?</h2>
        <p className="tenue" style={{ maxWidth: '50ch', margin: '10px auto 22px' }}>
          Parte en el plan Vitrina sin pagar nada y súbete cuando te convenga. Todos los emprendimientos del directorio
          empezaron así.
        </p>
        <Link to="/emprendimientos" className="btn btn-primario btn-grande">
          <Icono nombre="tienda" tam={18} /> Registrar mi emprendimiento
        </Link>
      </div>
    </div>
  )
}
