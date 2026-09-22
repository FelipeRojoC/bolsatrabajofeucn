import { Link } from 'react-router-dom'
import { CAMPUS, CONSEJOS_SEGURIDAD, MAX_DIAS_VIGENCIA } from '../lib/constants'
import { Icono, type NombreIcono } from '../components/Iconos'
import { Avatar, Nota } from '../components/UI'
import { Mapa } from '../components/Mapa'

const MESA = [
  { nombre: 'Antonia Vergara', cargo: 'Presidenta', carrera: 'Ingeniería Civil Industrial', color: '#2a78d6' },
  { nombre: 'Rodrigo Núñez', cargo: 'Vicepresidente', carrera: 'Derecho', color: '#eb6834' },
  { nombre: 'Paula Ossandón', cargo: 'Secretaria general', carrera: 'Psicología', color: '#1baf7a' },
  { nombre: 'Tomás Fuentes', cargo: 'Tesorero', carrera: 'Ingeniería Comercial', color: '#eda100' },
  { nombre: 'Javiera Contreras', cargo: 'Bienestar estudiantil', carrera: 'Enfermería', color: '#e87ba4' },
  { nombre: 'Esteban Rivas', cargo: 'Comunicaciones', carrera: 'Periodismo', color: '#4a3aa7' },
]

const COMISIONES: { nombre: string; icono: NombreIcono; texto: string }[] = [
  { nombre: 'Bienestar', icono: 'escudo', texto: 'Modera esta bolsa, gestiona el fondo solidario y acompaña casos de salud mental y situación económica.' },
  { nombre: 'Académica', icono: 'libro', texto: 'Representa a los estudiantes ante Vicerrectoría, revisa reglamentos y coordina las ayudantías.' },
  { nombre: 'Cultura y deportes', icono: 'destello', texto: 'Organiza los torneos internos, la semana mechona y las actividades entre carreras.' },
  { nombre: 'Comunicaciones', icono: 'megafono', texto: 'Mantiene las redes de la federación y difunde lo que pasa en ambos campus.' },
]

const HITOS = [
  { fecha: 'Marzo', titulo: 'Bienvenida mechona', texto: 'Feria de organizaciones, mercado de apuntes usados y asesoría para el proceso de beneficios.' },
  { fecha: 'Abril', titulo: 'Elecciones de centros de alumnos', texto: 'Acompañamiento a los procesos eleccionarios de cada carrera.' },
  { fecha: 'Junio', titulo: 'Rendición de cuentas del primer semestre', texto: 'Se presenta el presupuesto ejecutado, incluidos los ingresos del directorio de emprendimientos.' },
  { fecha: 'Agosto', titulo: 'Feria de emprendimientos UCN', texto: 'Los emprendimientos del directorio montan stands en el campus durante una semana.' },
  { fecha: 'Octubre', titulo: 'Semana de la universidad', texto: 'Actividades culturales y deportivas en Antofagasta y Coquimbo.' },
  { fecha: 'Diciembre', titulo: 'Asamblea de cierre', texto: 'Balance del año, rendición final y propuestas para el período siguiente.' },
]

const REGLAMENTO = [
  {
    q: '¿Quién puede publicar?',
    a: 'Cualquier persona con correo institucional vigente de la UCN: estudiantes de pregrado y postgrado, y funcionarios. Cada cuenta responde por lo que publica.',
  },
  {
    q: `¿Por qué los avisos duran solo ${MAX_DIAS_VIGENCIA} días?`,
    a: `Porque una bolsa llena de avisos viejos deja de servir. Al llegar a los ${MAX_DIAS_VIGENCIA} días el aviso se despublica solo; si sigue vigente puedes renovarlo una vez con un clic, y después republicarlo.`,
  },
  {
    q: '¿Qué no se puede publicar?',
    a: 'Alcohol, tabaco, vapes, medicamentos, armas y cualquier producto restringido. Tampoco trabajos académicos resueltos ("te hago la tesis"), que son una falta a la integridad académica. Tampoco se permiten avisos de terceros con fines puramente comerciales que no tengan relación con la comunidad UCN.',
  },
  {
    q: '¿Cómo funciona la moderación?',
    a: 'Cada aviso pasa por la Comisión de Bienestar antes de publicarse. El sistema le pone un puntaje de riesgo automático según su contenido, y los de mayor riesgo se revisan primero. Si se rechaza, recibes el motivo por escrito y puedes corregir y volver a enviarlo.',
  },
  {
    q: '¿La federación se hace responsable de los tratos?',
    a: 'No. La plataforma pone en contacto a dos personas y ahí termina su rol: no procesa pagos, no retiene dinero, no despacha productos y no garantiza la calidad de nada. Si algo sale mal, repórtalo y la moderación actúa sobre el aviso y la cuenta.',
  },
  {
    q: '¿Qué pasa con mis datos?',
    a: 'Tu contacto solo se muestra cuando alguien pulsa "Ver contacto", y se registra el total de clics, nunca quién los hizo. Las estadísticas públicas son del aviso, no de las personas.',
  },
]

export const Feucn = () => (
  <>
    <section className="heroe">
      <div className="contenedor contenedor-ancho heroe-inner">
        <span className="etiqueta etiqueta-marca" style={{ marginBottom: 16 }}>
          <Icono nombre="usuarios" tam={13} /> Federación de Estudiantes UCN
        </span>
        <h1>Somos la organización que representa a los estudiantes de la UCN.</h1>
        <p className="heroe-bajada">
          Antofagasta y Coquimbo, pregrado y postgrado. La FEUCN articula a los centros de alumnos, negocia con la
          universidad y sostiene proyectos como esta bolsa de trabajo.
        </p>
        <div className="heroe-acciones">
          <a href="#contacto" className="btn btn-primario btn-grande"><Icono nombre="correo" tam={18} /> Contactar a la federación</a>
          <a href="#reglamento" className="btn btn-grande"><Icono nombre="libro" tam={18} /> Reglamento de la bolsa</a>
        </div>
      </div>
    </section>

    <section className="contenedor contenedor-ancho seccion">
      <div className="seccion-titulo">
        <div>
          <h2>Por qué existe esta bolsa</h2>
        </div>
      </div>
      <div className="grilla-avisos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="panel panel-relleno columna" style={{ gap: 10 }}>
          <Icono nombre="megafono" tam={22} style={{ color: 'var(--serie-1)' }} />
          <h3 style={{ fontSize: '1rem' }}>Todo estaba disperso</h3>
          <p className="chico tenue" style={{ margin: 0 }}>
            Los datos de trabajos y las ventas entre estudiantes vivían en grupos de WhatsApp que se llenaban, historias
            que se borraban a las 24 horas y muros de Facebook que ya nadie mira. Se perdía todo.
          </p>
        </div>
        <div className="panel panel-relleno columna" style={{ gap: 10 }}>
          <Icono nombre="escudo" tam={22} style={{ color: 'var(--serie-3)' }} />
          <h3 style={{ fontSize: '1rem' }}>Hacía falta alguien que responda</h3>
          <p className="chico tenue" style={{ margin: 0 }}>
            En un grupo sin moderación cualquiera publica cualquier cosa. Acá cada aviso pasa por la Comisión de
            Bienestar y hay un botón de reporte que llega a una persona real.
          </p>
        </div>
        <div className="panel panel-relleno columna" style={{ gap: 10 }}>
          <Icono nombre="tienda" tam={22} style={{ color: 'var(--serie-2)' }} />
          <h3 style={{ fontSize: '1rem' }}>Los emprendimientos merecen vitrina</h3>
          <p className="chico tenue" style={{ margin: 0 }}>
            Hay decenas de negocios llevados por estudiantes que solo se conocen de boca en boca. El directorio les da
            un lugar fijo y, de paso, financia el resto de la plataforma.
          </p>
        </div>
      </div>
    </section>

    <section style={{ background: 'var(--superficie)', borderBlock: '1px solid var(--borde)' }}>
      <div className="contenedor contenedor-ancho seccion">
        <div className="seccion-titulo">
          <div>
            <h2>Mesa directiva</h2>
            <p>Período 2026. Cualquiera puede escribirles directamente.</p>
          </div>
        </div>
        <div className="grilla-equipo">
          {MESA.map((m) => (
            <div className="miembro" key={m.nombre}>
              <Avatar nombre={m.nombre} color={m.color} tam="lg" />
              <div className="crecer">
                <div className="fuerte chico">{m.nombre}</div>
                <div className="mini" style={{ color: 'var(--marca)', fontWeight: 650 }}>{m.cargo}</div>
                <div className="mini muy-tenue">{m.carrera}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="contenedor contenedor-ancho seccion">
      <div className="seccion-titulo">
        <div>
          <h2>Comisiones de trabajo</h2>
          <p>La bolsa la administra la Comisión de Bienestar.</p>
        </div>
      </div>
      <div className="grilla-avisos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {COMISIONES.map((c) => (
          <div className="panel panel-relleno columna" style={{ gap: 9 }} key={c.nombre}>
            <span className="opcion-icono"><Icono nombre={c.icono} tam={19} /></span>
            <h3 style={{ fontSize: '0.98rem' }}>{c.nombre}</h3>
            <p className="chico tenue" style={{ margin: 0 }}>{c.texto}</p>
          </div>
        ))}
      </div>
    </section>

    <section style={{ background: 'var(--superficie)', borderBlock: '1px solid var(--borde)' }}>
      <div className="contenedor contenedor-ancho seccion">
        <div className="seccion-titulo">
          <div>
            <h2>El año de la federación</h2>
            <p>Los hitos fijos del calendario estudiantil.</p>
          </div>
        </div>
        <div className="linea-tiempo" style={{ maxWidth: 680 }}>
          {HITOS.map((h, i) => (
            <div className="hito" key={h.titulo}>
              <div className="hito-marca">
                <span className="hito-punto" />
                {i < HITOS.length - 1 && <span className="hito-linea" />}
              </div>
              <div className="hito-cuerpo">
                <span className="mayus" style={{ color: 'var(--marca)' }}>{h.fecha}</span>
                <h3 style={{ fontSize: '1rem', margin: '3px 0 5px' }}>{h.titulo}</h3>
                <p className="chico tenue" style={{ margin: 0 }}>{h.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="contenedor contenedor-ancho seccion" id="reglamento">
      <div className="seccion-titulo">
        <div>
          <h2>Reglamento de la bolsa</h2>
          <p>Las reglas que aplica la moderación, escritas como se leen.</p>
        </div>
      </div>
      <div style={{ maxWidth: 780 }}>
        {REGLAMENTO.map((r) => (
          <details className="acordeon" key={r.q}>
            <summary>{r.q}</summary>
            <div className="acordeon-cuerpo">{r.a}</div>
          </details>
        ))}
      </div>

      <div style={{ marginTop: 22, maxWidth: 780 }}>
        <Nota tono="aviso" icono="escudo">
          <strong>Para juntarse con alguien que no conoces:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {CONSEJOS_SEGURIDAD.map((c) => <li key={c} className="chico">{c}</li>)}
          </ul>
        </Nota>
      </div>
    </section>

    <section style={{ background: 'var(--superficie)', borderTop: '1px solid var(--borde)' }} id="contacto">
      <div className="contenedor contenedor-ancho seccion">
        <div className="seccion-titulo">
          <div>
            <h2>Dónde encontrarnos</h2>
            <p>La oficina de la federación está en Casa Central. Ahí también se reciben los objetos encontrados.</p>
          </div>
        </div>
        <div className="detalle-rejilla">
          <Mapa centro={CAMPUS[0].punto} zoom={16} puntos={[{ id: 'feucn', punto: CAMPUS[0].punto, color: 'var(--marca)', titulo: 'Oficina FEUCN — Casa Central' }]} />
          <aside className="columna" style={{ gap: 14 }}>
            <div className="panel panel-relleno">
              <div className="mayus tenue" style={{ marginBottom: 6 }}>Oficina</div>
              <div className="dato"><span className="dato-lbl">Dirección</span><span className="dato-val">Casa Central, Av. Angamos 0610, Antofagasta</span></div>
              <div className="dato"><span className="dato-lbl">Horario</span><span className="dato-val">Lunes a viernes, 10:00 a 17:00</span></div>
              <div className="dato"><span className="dato-lbl">Coquimbo</span><span className="dato-val">Campus Guayacán, edificio de servicios estudiantiles</span></div>
            </div>
            <div className="panel panel-relleno columna" style={{ gap: 8 }}>
              <div className="mayus tenue">Escríbenos</div>
              <a className="red-pastilla" href="mailto:contacto@feucn.cl"><Icono nombre="correo" tam={16} /> contacto@feucn.cl</a>
              <a className="red-pastilla" href="mailto:bienestar@feucn.cl"><Icono nombre="escudo" tam={16} /> bienestar@feucn.cl</a>
              <a className="red-pastilla red-ig" href="https://instagram.com/feucn" target="_blank" rel="noreferrer">
                <Icono nombre="instagram" tam={16} /> @feucn
              </a>
            </div>
            <Link to="/publicar" className="btn btn-primario btn-bloque">
              <Icono nombre="mas" tam={17} /> Publicar un aviso
            </Link>
          </aside>
        </div>
      </div>
    </section>
  </>
)
