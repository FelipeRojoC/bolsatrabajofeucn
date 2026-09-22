import { CAMPUS, MAX_DIAS_VIGENCIA } from './constants'
import type {
  AnalyticsEvent,
  Campus,
  Database,
  Emprendimiento,
  Post,
  PostType,
  Report,
  SolicitudPlan,
  User,
} from './types'

/** PRNG determinista: los datos de demo se ven iguales en cada recarga. */
const rng = (semilla: number) => {
  let s = semilla >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const AHORA = Date.now()
const DIA = 86_400_000
const HORA = 3_600_000

const iso = (ms: number) => new Date(ms).toISOString()

const puntoCerca = (campus: Campus, r: () => number) => {
  const base = CAMPUS.find((c) => c.id === campus) ?? CAMPUS[0]
  return {
    lat: base.punto.lat + (r() - 0.5) * 0.006,
    lng: base.punto.lng + (r() - 0.5) * 0.006,
  }
}

export const USUARIOS: User[] = [
  {
    id: 'u-demo',
    nombre: 'Javiera Rojas',
    correo: 'javiera.rojas@alumnos.ucn.cl',
    carrera: 'Ingeniería Civil Industrial',
    campus: 'Antofagasta — Casa Central',
    role: 'estudiante',
    avatar: '#2a78d6',
  },
  {
    id: 'u-mod',
    nombre: 'Comisión de Bienestar FEUCN',
    correo: 'bienestar@feucn.cl',
    carrera: 'Federación de Estudiantes',
    campus: 'Antofagasta — Casa Central',
    role: 'moderador',
    avatar: '#1baf7a',
  },
  { id: 'u-1', nombre: 'Matías Pizarro', correo: 'matias.pizarro@alumnos.ucn.cl', carrera: 'Ingeniería en Computación e Informática', campus: 'Antofagasta — Casa Central', role: 'estudiante', avatar: '#eb6834' },
  { id: 'u-2', nombre: 'Constanza Álvarez', correo: 'constanza.alvarez@alumnos.ucn.cl', carrera: 'Biología Marina', campus: 'Coquimbo — Campus Guayacán', role: 'estudiante', avatar: '#1baf7a' },
  { id: 'u-3', nombre: 'Ignacio Tapia', correo: 'ignacio.tapia@alumnos.ucn.cl', carrera: 'Ingeniería Civil de Minas', campus: 'Antofagasta — Casa Central', role: 'estudiante', avatar: '#4a3aa7' },
  { id: 'u-4', nombre: 'Fernanda Muñoz', correo: 'fernanda.munoz@alumnos.ucn.cl', carrera: 'Psicología', campus: 'Antofagasta — Casa Central', role: 'estudiante', avatar: '#e87ba4' },
  { id: 'u-5', nombre: 'Diego Cortés', correo: 'diego.cortes@alumnos.ucn.cl', carrera: 'Derecho', campus: 'Coquimbo — Campus Guayacán', role: 'estudiante', avatar: '#eda100' },
  { id: 'u-6', nombre: 'Camila Araya', correo: 'camila.araya@alumnos.ucn.cl', carrera: 'Arquitectura', campus: 'Antofagasta — Campus Angamos', role: 'estudiante', avatar: '#e34948' },
  { id: 'u-7', nombre: 'Sebastián Núñez', correo: 'sebastian.nunez@alumnos.ucn.cl', carrera: 'Ingeniería Comercial', campus: 'Antofagasta — Casa Central', role: 'estudiante', avatar: '#199e70' },
  { id: 'u-8', nombre: 'Valentina Soto', correo: 'valentina.soto@alumnos.ucn.cl', carrera: 'Enfermería', campus: 'Coquimbo — Campus Guayacán', role: 'estudiante', avatar: '#3987e5' },
]

const usuario = (id: string) => USUARIOS.find((u) => u.id === id)!

interface SemillaPost {
  id: string
  type: PostType
  titulo: string
  descripcion: string
  precio?: number
  precioNota?: string
  categoria: string
  estadoArticulo?: Post['estadoArticulo']
  autorId: string
  campus: Campus
  zona: string
  referencia?: string
  /** Horas atrás en que se publicó. */
  hace: number
  dias?: number
  status?: Post['status']
  lostKind?: Post['lostKind']
  resuelto?: boolean
  vistas: number
  clics: number
  riesgo?: number
  banderas?: string[]
  respuestas?: { autor: string; carrera?: string; mensaje: string; hace: number }[]
}

const SEMILLAS: SemillaPost[] = [
  // ── Trabajos ────────────────────────────────────────────────────────────
  {
    id: 'p-1', type: 'trabajo', titulo: 'Ayudantía de Cálculo I y II — presencial o por Meet',
    descripcion:
      'Estudiante de cuarto año de Civil Industrial. Hago ayudantías de Cálculo I y II, enfocadas en preparar certámenes. Trabajo con guías de años anteriores y resolvemos ejercicios tipo prueba.\n\nSesiones de 90 minutos, individuales o en grupos de hasta 4 (el valor se divide). Disponibilidad lunes a jueves después de las 18:00 y sábados en la mañana.',
    precio: 8000, precioNota: 'por hora', categoria: 'Ayudantía', autorId: 'u-demo',
    campus: 'Antofagasta — Casa Central', zona: 'Biblioteca central', referencia: 'Sala de estudio del segundo piso',
    hace: 9, vistas: 412, clics: 63,
  },
  {
    id: 'p-2', type: 'trabajo', titulo: 'Busco quien me ayude con diseño de afiches para evento de carrera',
    descripcion:
      'El Centro de Alumnos de Psicología necesita 5 afiches para la semana de la carrera (formato Instagram + un pendón). Tenemos la identidad visual definida, hay que aplicarla.\n\nEntrega en dos semanas. Pagamos con fondos del CEE, se coordina con la tesorera. Ideal si tienes portafolio, aunque sea de ramos.',
    precio: 60000, precioNota: 'por el pack completo', categoria: 'Diseño y audiovisual', autorId: 'u-4',
    campus: 'Antofagasta — Casa Central', zona: 'Edificio Y', hace: 26, vistas: 288, clics: 41,
  },
  {
    id: 'p-3', type: 'trabajo', titulo: 'Se necesitan 4 garzones para matrimonio — sábado, turno noche',
    descripcion:
      'Empresa de banquetería de Antofagasta busca apoyo para un evento el sábado 18:00 a 02:00. No se necesita experiencia previa, se hace inducción a las 17:00. Uniforme lo entregamos nosotros (camisa blanca la pones tú).\n\nPago el mismo día al terminar el turno. Movilización de vuelta incluida para quienes viven en el sector norte.',
    precio: 45000, precioNota: 'por turno', categoria: 'Eventos y producción', autorId: 'u-7',
    campus: 'Fuera del campus', zona: 'A coordinar por mensaje', hace: 5, vistas: 734, clics: 158,
  },
  {
    id: 'p-4', type: 'trabajo', titulo: 'Programo tu landing page o portafolio (React / WordPress)',
    descripcion:
      'Tengo 3 cupos libres este mes. Hago sitios de una página para emprendimientos, portafolios de titulación o landings de eventos. Incluye dominio configurado y versión móvil.\n\nTe muestro un avance a los 3 días y ajustamos. Si es para un proyecto de la universidad o un emprendimiento de la misma UCN, hay descuento.',
    precio: 0, precioNota: 'Conversable según alcance', categoria: 'Programación y soporte TI', autorId: 'u-1',
    campus: 'Antofagasta — Casa Central', zona: 'Casino', hace: 40, vistas: 521, clics: 88,
  },
  {
    id: 'p-5', type: 'trabajo', titulo: 'Clases de natación y salvavidas — piscina Guayacán',
    descripcion:
      'Soy monitora certificada y hago clases particulares de natación para principiantes y nivel intermedio. También preparo para el test de salvavidas.\n\nHorarios de mañana. Se coordina el acceso a la piscina del campus.',
    precio: 12000, precioNota: 'por clase', categoria: 'Clases particulares', autorId: 'u-2',
    campus: 'Coquimbo — Campus Guayacán', zona: 'Cancha', hace: 62, vistas: 196, clics: 24,
  },

  // ── Ventas ──────────────────────────────────────────────────────────────
  {
    id: 'p-6', type: 'venta', titulo: 'Calculadora Casio fx-991LA CX — como nueva',
    descripcion:
      'La usé un semestre y me cambié a otra carrera. Funciona perfecto, viene con la tapa y el manual. Ideal para los primeros años de ingeniería.\n\nLa entrego en la entrada de Casa Central entre clases, cualquier día entre 13:00 y 14:00.',
    precio: 22000, categoria: 'Tecnología', estadoArticulo: 'como-nuevo', autorId: 'u-3',
    campus: 'Antofagasta — Casa Central', zona: 'Entrada principal', hace: 3, vistas: 640, clics: 112,
  },
  {
    id: 'p-7', type: 'venta', titulo: 'Pack de libros de Derecho Civil — Alessandri, Ducci y apuntes',
    descripcion:
      'Vendo el pack completo que usé en segundo año: Alessandri (tomos I y II), Ducci Claro y una carpeta con mis apuntes anillados de todo el año, ordenados por unidad.\n\nLos libros están subrayados a lápiz grafito, nada rayado con destacador. Vendo el pack junto, no por separado.',
    precio: 45000, categoria: 'Libros y apuntes', estadoArticulo: 'usado', autorId: 'u-5',
    campus: 'Coquimbo — Campus Guayacán', zona: 'Biblioteca Guayacán', hace: 14, vistas: 302, clics: 47,
  },
  {
    id: 'p-8', type: 'venta', titulo: 'Bicicleta aro 29 — perfecta para venir al campus',
    descripcion:
      'Bicicleta de montaña aro 29, 21 cambios, frenos de disco delanteros. La usé un año para moverme entre la casa y Angamos. Le acabo de poner cámaras nuevas.\n\nIncluye candado en U y luz trasera. Se prueba antes de cualquier trato, sin problema.',
    precio: 130000, categoria: 'Bicicletas y movilidad', estadoArticulo: 'usado', autorId: 'u-6',
    campus: 'Antofagasta — Campus Angamos', zona: 'Estacionamiento', hace: 30, vistas: 887, clics: 174,
  },
  {
    id: 'p-9', type: 'venta', titulo: 'Mesa de dibujo técnico + escalímetro (mudanza)',
    descripcion:
      'Me titulo y estoy dejando el departamento. Mesa de dibujo regulable con su banqueta, más escalímetro, escuadras y plantillas.\n\nPrioridad para quien pueda retirar este fin de semana en el centro de Antofagasta. Regalo un tubo portaplanos con eso.',
    precio: 55000, precioNota: 'Conversable si llevas todo', categoria: 'Materiales de carrera', estadoArticulo: 'usado', autorId: 'u-6',
    campus: 'Fuera del campus', zona: 'Mall / centro', hace: 52, vistas: 244, clics: 38,
  },
  {
    id: 'p-10', type: 'venta', titulo: 'Delantal clínico talla M — usado un semestre',
    descripcion:
      'Delantal blanco manga larga, talla M, marca institucional. Lo usé un semestre de prácticas, está impecable y recién lavado.\n\nCambié de talla, por eso lo vendo. Lo entrego en Guayacán.',
    precio: 12000, categoria: 'Ropa y calzado', estadoArticulo: 'usado', autorId: 'u-8',
    campus: 'Coquimbo — Campus Guayacán', zona: 'Casino', hace: 8, vistas: 158, clics: 29,
  },
  {
    id: 'p-11', type: 'venta', titulo: 'Regalo cajas y papel de embalaje (mudanza)',
    descripcion:
      'Me cambio de depto y me quedaron como 12 cajas de cartón en buen estado, papel burbuja y diarios. Se los regalo a quien los venga a buscar.\n\nPrimero que escriba, primero que se los lleva.',
    precio: 0, categoria: 'Hogar y mudanza', estadoArticulo: 'usado', autorId: 'u-7',
    campus: 'Fuera del campus', zona: 'A coordinar por mensaje', hace: 20, vistas: 431, clics: 96,
  },

  // ── Foro: ¿se perdió esto? ──────────────────────────────────────────────
  {
    id: 'p-12', type: 'perdido', lostKind: 'encontrado',
    titulo: 'Encontré una TNE a nombre de "M. Rivera" en el casino',
    descripcion:
      'Estaba sobre una mesa del casino central el jueves como a las 14:30. La dejé en la oficina de la FEUCN para que la retire su dueño.\n\nSi eres tú, pasa con tu cédula. No publico el RUT completo por seguridad.',
    categoria: 'Documentos y TNE', autorId: 'u-4',
    campus: 'Antofagasta — Casa Central', zona: 'Casino', hace: 18, vistas: 512, clics: 34,
    respuestas: [
      { autor: 'Martín Rivera', carrera: 'Ingeniería Civil Industrial', mensaje: '¡Soy yo! Paso mañana a primera hora. Muchas gracias por dejarla en la federación 🙏', hace: 14 },
      { autor: 'Comisión de Bienestar FEUCN', carrera: 'FEUCN', mensaje: 'Confirmamos que la TNE está en la oficina. Horario de atención: 10:00 a 17:00.', hace: 12 },
    ],
  },
  {
    id: 'p-13', type: 'perdido', lostKind: 'perdido',
    titulo: 'Perdí mis llaves con un llavero de ballena azul',
    descripcion:
      'Se me cayeron entre el pabellón de Ciencias del Mar y la biblioteca, el martes en la tarde. Son tres llaves en un llavero de ballena azul tejido.\n\nSi alguien las vio, aviso por acá o déjenlas en portería. Es el único juego que tengo 😭',
    categoria: 'Llaves', autorId: 'u-2',
    campus: 'Coquimbo — Campus Guayacán', zona: 'Biblioteca Guayacán', hace: 33, vistas: 289, clics: 21,
    respuestas: [
      { autor: 'Diego Cortés', carrera: 'Derecho', mensaje: 'Vi unas llaves con llavero tejido en el mesón de portería el miércoles. Anda a preguntar.', hace: 28 },
    ],
  },
  {
    id: 'p-14', type: 'perdido', lostKind: 'encontrado', resuelto: true,
    titulo: 'Encontrado: audífonos negros en la sala Y-204',
    descripcion:
      'Quedaron en la sala después de la clase de las 10. Los tengo yo, escríbeme describiendo el estuche y te los devuelvo.',
    categoria: 'Tecnología', autorId: 'u-1',
    campus: 'Antofagasta — Casa Central', zona: 'Edificio Y', hace: 70, vistas: 377, clics: 52,
    respuestas: [
      { autor: 'Camila Araya', carrera: 'Arquitectura', mensaje: 'Eran míos, el estuche tiene un sticker de un gato. ¡Ya me los devolvieron, gracias!', hace: 64 },
    ],
  },
  {
    id: 'p-15', type: 'perdido', lostKind: 'perdido',
    titulo: 'Se perdió un gato naranjo que anda por Angamos',
    descripcion:
      'El "Michi de Angamos" que vive en el campus no aparece hace tres días. Es naranjo, con una oreja mordida, muy sociable.\n\nLos que le damos comida estamos preocupados. Si lo ven, avisen por acá. No lo saquen del campus, es su territorio.',
    categoria: 'Mascotas en el campus', autorId: 'u-6',
    campus: 'Antofagasta — Campus Angamos', zona: 'Cafetería', hace: 44, vistas: 1204, clics: 67,
    respuestas: [
      { autor: 'Sebastián Núñez', carrera: 'Ingeniería Comercial', mensaje: 'Lo vi ayer detrás de los laboratorios, estaba bien. Le dejé comida.', hace: 20 },
      { autor: 'Fernanda Muñoz', carrera: 'Psicología', mensaje: 'Confirmo, andaba por ahí en la mañana 🐈', hace: 16 },
    ],
  },

  {
    id: 'p-22', type: 'perdido', lostKind: 'perdido',
    titulo: 'Perdí el cargador de mi notebook en el Edificio Y',
    descripcion:
      'Es un cargador de notebook Lenovo, negro, con el cable enrollado con un elástico rojo. Lo dejé enchufado en una sala del Edificio Y el lunes en la tarde y cuando volví ya no estaba.\n\nSi alguien lo desenchufó pensando que era suyo, no hay problema: solo avísenme por acá. Lo necesito para los certámenes de esta semana.',
    categoria: 'Tecnología', autorId: 'u-4',
    campus: 'Antofagasta — Casa Central', zona: 'Edificio Y', hace: 22, vistas: 341, clics: 28,
  },
  {
    id: 'p-23', type: 'perdido', lostKind: 'encontrado',
    titulo: 'Encontré un cargador de notebook en una sala del Edificio Y',
    descripcion:
      'Estaba enchufado solo en una sala vacía del Edificio Y, así que lo guardé para que no se perdiera. Es de marca Lenovo.\n\nDescríbeme cómo está el cable y te lo devuelvo. Ando todos los días por Casa Central.',
    categoria: 'Tecnología', autorId: 'u-7',
    campus: 'Antofagasta — Casa Central', zona: 'Biblioteca central', hace: 10, vistas: 268, clics: 19,
  },

  // ── En cola de moderación ───────────────────────────────────────────────
  {
    id: 'p-16', type: 'venta', status: 'pendiente',
    titulo: 'Vendo notebook Lenovo i5 — 8GB RAM, SSD 512',
    descripcion:
      'Notebook Lenovo IdeaPad, i5 de décima generación, 8GB de RAM y SSD de 512. Lo compré el año pasado y me cambié a un Mac.\n\nBatería dura unas 5 horas. Incluye cargador original y una funda. Se prueba donde quieran.',
    precio: 290000, categoria: 'Tecnología', estadoArticulo: 'usado', autorId: 'u-3',
    campus: 'Antofagasta — Casa Central', zona: 'Entrada principal', hace: 2, vistas: 0, clics: 0,
  },
  {
    id: 'p-17', type: 'trabajo', status: 'pendiente',
    titulo: 'Hago informes y trabajos universitarios, entrega rápida',
    descripcion:
      'Redacto informes, ensayos y trabajos de cualquier ramo. Entrega en 48 horas, con normas APA. Se paga con transferencia por adelantado.',
    precio: 25000, categoria: 'Traducción y redacción', autorId: 'u-5',
    campus: 'Fuera del campus', zona: 'A coordinar por mensaje', hace: 1, vistas: 0, clics: 0,
  },
  {
    id: 'p-18', type: 'venta', status: 'pendiente',
    titulo: 'Liquido stock de poleras del mundial',
    descripcion:
      'Tengo 40 poleras en distintas tallas. Vendo el lote completo o por unidad. Recibo solo transferencia, el despacho es por pagar.',
    precio: 6000, categoria: 'Ropa y calzado', estadoArticulo: 'nuevo', autorId: 'u-7',
    campus: 'Fuera del campus', zona: 'Terminal de buses', hace: 4, vistas: 0, clics: 0,
  },
  {
    id: 'p-19', type: 'venta', status: 'rechazado',
    titulo: 'Vendo cerveza artesanal por caja para la fiesta de carrera',
    descripcion: 'Cajas de 12 unidades de cerveza artesanal local. Despacho al campus.',
    precio: 24000, categoria: 'Otro', autorId: 'u-3',
    campus: 'Antofagasta — Casa Central', zona: 'Entrada principal', hace: 96, vistas: 0, clics: 0,
  },

  // ── Ya expirados / archivados (alimentan estadística histórica) ─────────
  {
    id: 'p-20', type: 'venta', status: 'expirado',
    titulo: 'Monitor 24" Samsung — vendido',
    descripcion: 'Monitor Full HD de 24 pulgadas con su cable HDMI y base original.',
    precio: 65000, categoria: 'Tecnología', estadoArticulo: 'usado', autorId: 'u-1',
    campus: 'Antofagasta — Casa Central', zona: 'Casino', hace: 170, vistas: 703, clics: 131,
  },
  {
    id: 'p-21', type: 'trabajo', status: 'archivado',
    titulo: 'Buscábamos fotógrafo para la gala de Ingeniería',
    descripcion: 'Cobertura de la gala, entrega de 80 fotos editadas. Cupo ya cubierto, gracias a todos los que escribieron.',
    precio: 90000, categoria: 'Diseño y audiovisual', autorId: 'u-7',
    campus: 'Fuera del campus', zona: 'Mall / centro', hace: 200, vistas: 559, clics: 143,
  },
]

const detectarRiesgoSemilla = (s: SemillaPost) => {
  if (s.id === 'p-17') return { riesgo: 85, banderas: ['Posible falta a la integridad académica', 'Pide pago adelantado'] }
  if (s.id === 'p-18') return { riesgo: 45, banderas: ['Menciona transferencia de dinero', 'Volumen comercial, no estudiantil'] }
  if (s.id === 'p-19') return { riesgo: 70, banderas: ['Producto restringido'] }
  return { riesgo: s.riesgo ?? 5, banderas: s.banderas ?? [] }
}

const construirPost = (s: SemillaPost, r: () => number): Post => {
  const autor = usuario(s.autorId)
  const creado = AHORA - s.hace * HORA
  const dias = s.dias ?? MAX_DIAS_VIGENCIA
  const status = s.status ?? 'aprobado'
  const publicado = status === 'pendiente' ? undefined : creado + 20 * 60_000
  const { riesgo, banderas } = detectarRiesgoSemilla(s)

  return {
    id: s.id,
    type: s.type,
    titulo: s.titulo,
    descripcion: s.descripcion,
    precio: s.precio,
    precioNota: s.precioNota,
    categoria: s.categoria,
    estadoArticulo: s.estadoArticulo,
    imagenes: [],
    ubicacion: {
      campus: s.campus,
      zona: s.zona,
      referencia: s.referencia,
      punto: puntoCerca(s.campus, r),
    },
    contacto: {
      nombre: autor.nombre,
      carrera: autor.carrera,
      correo: autor.correo,
      whatsapp: `+569${Math.floor(10_000_000 + r() * 89_999_999)}`,
      instagram: autor.nombre.toLowerCase().split(' ')[0] + '.ucn',
      preferido: r() > 0.4 ? 'whatsapp' : 'correo',
    },
    autorId: s.autorId,
    creadoEn: iso(creado),
    publicadoEn: publicado ? iso(publicado) : undefined,
    expiraEn: iso((publicado ?? creado) + dias * DIA),
    diasVigencia: dias,
    renovaciones: 0,
    status,
    moderacion:
      status === 'aprobado' || status === 'expirado' || status === 'archivado'
        ? { revisadoPor: 'Comisión de Bienestar FEUCN', revisadoEn: iso(creado + 18 * 60_000) }
        : status === 'rechazado'
          ? {
              revisadoPor: 'Comisión de Bienestar FEUCN',
              revisadoEn: iso(creado + 40 * 60_000),
              motivo: 'Producto o servicio prohibido por el reglamento',
              nota: 'El reglamento de convivencia no permite la venta de alcohol en canales de la federación.',
            }
          : undefined,
    stats: {
      vistas: s.vistas,
      clicsContacto: s.clics,
      guardados: Math.round(s.clics * (0.4 + r() * 0.5)),
      compartidos: Math.round(s.clics * (0.1 + r() * 0.2)),
    },
    riesgo,
    banderas,
    lostKind: s.lostKind,
    resuelto: s.resuelto,
    respuestas: s.respuestas?.map((resp, i) => ({
      id: `${s.id}-r${i}`,
      autor: resp.autor,
      carrera: resp.carrera,
      mensaje: resp.mensaje,
      creadoEn: iso(AHORA - resp.hace * HORA),
    })),
  }
}


/**
 * Avisos históricos ya cerrados. Existen para que las series de 30 días tengan
 * fondo: sin ellos, toda la actividad se amontona en los últimos días y las
 * comparativas semanales del panel no significan nada.
 */
const PLANTILLAS_HISTORICAS: { type: PostType; titulo: string; categoria: string; precio?: number }[] = [
  { type: 'venta', titulo: 'Libro de Química General de Chang — 12ª edición', categoria: 'Libros y apuntes', precio: 18000 },
  { type: 'venta', titulo: 'Tablet Samsung Tab A8 con lápiz', categoria: 'Tecnología', precio: 95000 },
  { type: 'venta', titulo: 'Overol de terreno talla L, poco uso', categoria: 'Materiales de carrera', precio: 20000 },
  { type: 'venta', titulo: 'Mochila Jansport negra', categoria: 'Mochilas y bolsos', precio: 15000 },
  { type: 'venta', titulo: 'Silla de escritorio ergonómica', categoria: 'Hogar y mudanza', precio: 38000 },
  { type: 'venta', titulo: 'Apuntes anillados de Termodinámica', categoria: 'Libros y apuntes', precio: 8000 },
  { type: 'venta', titulo: 'Teclado mecánico 60% con switches rojos', categoria: 'Tecnología', precio: 32000 },
  { type: 'venta', titulo: 'Zapatos de seguridad punta de acero N° 42', categoria: 'Ropa y calzado', precio: 22000 },
  { type: 'venta', titulo: 'Scooter eléctrico, batería recién cambiada', categoria: 'Bicicletas y movilidad', precio: 145000 },
  { type: 'venta', titulo: 'Microscopio escolar para prácticas', categoria: 'Instrumentos y herramientas', precio: 60000 },
  { type: 'venta', titulo: 'Regalo repisas y un velador (me mudo)', categoria: 'Hogar y mudanza', precio: 0 },
  { type: 'venta', titulo: 'Cámara Canon EOS Rebel T6 con lente 18-55', categoria: 'Tecnología', precio: 210000 },
  { type: 'trabajo', titulo: 'Ayudantía de Álgebra Lineal, grupos reducidos', categoria: 'Ayudantía', precio: 7000 },
  { type: 'trabajo', titulo: 'Busco quien edite video para tesis', categoria: 'Diseño y audiovisual', precio: 40000 },
  { type: 'trabajo', titulo: 'Reparto de volantes para feria, dos días', categoria: 'Eventos y producción', precio: 30000 },
  { type: 'trabajo', titulo: 'Clases de inglés conversacional', categoria: 'Clases particulares', precio: 10000 },
  { type: 'trabajo', titulo: 'Soporte técnico y formateo a domicilio', categoria: 'Programación y soporte TI', precio: 15000 },
  { type: 'trabajo', titulo: 'Se busca ayudante para local de comida, fines de semana', categoria: 'Ventas y atención', precio: 40000 },
  { type: 'trabajo', titulo: 'Traducciones técnicas inglés-español', categoria: 'Traducción y redacción', precio: 12000 },
  { type: 'trabajo', titulo: 'Cupo de práctica profesional en oficina de arquitectura', categoria: 'Práctica profesional' },
  { type: 'trabajo', titulo: 'Tomo fotos de producto para emprendimientos', categoria: 'Diseño y audiovisual', precio: 25000 },
  { type: 'perdido', titulo: 'Encontré un cuaderno de Anatomía en el bus 129', categoria: 'Otro' },
  { type: 'perdido', titulo: 'Perdí mi botella térmica azul en el gimnasio', categoria: 'Otro' },
  { type: 'perdido', titulo: 'Encontrado: cargador de notebook en la biblioteca', categoria: 'Tecnología' },
]

const construirHistoricos = (r: () => number): Post[] =>
  PLANTILLAS_HISTORICAS.map((t, i) => {
    // Repartidos entre hace 30 y hace 6 días, para cubrir toda la ventana.
    const diasAtras = 6 + (i / PLANTILLAS_HISTORICAS.length) * 24 + r() * 1.5
    const creado = AHORA - diasAtras * DIA
    const publicado = creado + 25 * 60_000
    const autor = USUARIOS[2 + (i % (USUARIOS.length - 2))]
    const dias = 3 + Math.floor(r() * 3)
    const vistas = Math.round(380 + r() * 1400)
    const clics = Math.round(vistas * (0.08 + r() * 0.16))

    return {
      id: `h-${i}`,
      type: t.type,
      titulo: t.titulo,
      descripcion:
        'Aviso del historial de la bolsa. Se mantiene para las estadísticas, pero su vigencia ya terminó y no recibe contactos nuevos.',
      precio: t.precio,
      categoria: t.categoria,
      imagenes: [],
      ubicacion: {
        campus: autor.campus,
        zona: (CAMPUS.find((c) => c.id === autor.campus) ?? CAMPUS[0]).zonas[Math.floor(r() * 3)],
        punto: puntoCerca(autor.campus, r),
      },
      contacto: {
        nombre: autor.nombre,
        carrera: autor.carrera,
        correo: autor.correo,
        whatsapp: `+569${Math.floor(10_000_000 + r() * 89_999_999)}`,
        preferido: 'correo' as const,
      },
      autorId: autor.id,
      creadoEn: iso(creado),
      publicadoEn: iso(publicado),
      expiraEn: iso(publicado + dias * DIA),
      diasVigencia: dias,
      renovaciones: 0,
      status: (r() > 0.55 ? 'archivado' : 'expirado') as Post['status'],
      moderacion: { revisadoPor: 'Comisión de Bienestar FEUCN', revisadoEn: iso(creado + 22 * 60_000) },
      stats: {
        vistas,
        clicsContacto: clics,
        guardados: Math.round(clics * 0.6),
        compartidos: Math.round(clics * 0.18),
      },
      riesgo: Math.floor(r() * 12),
      banderas: [],
      lostKind: t.type === 'perdido' ? (t.titulo.startsWith('Encontr') ? 'encontrado' : 'perdido') : undefined,
      resuelto: t.type === 'perdido' ? r() > 0.4 : undefined,
    }
  })

const EMPRENDIMIENTOS_SEED: Omit<Emprendimiento, 'stats' | 'creadoEn' | 'suscripcionHasta' | 'suscripcionStatus'>[] = [
  {
    id: 'e-1', nombre: 'Dulce Norte', lema: 'Tortas y kuchen hechos entre certámenes',
    descripcion:
      'Repostería casera hecha por dos estudiantes de Enfermería. Partimos vendiendo brownies en los pasillos para costear la carrera y hoy tomamos pedidos de tortas completas para cumpleaños, titulaciones y actividades de carrera.\n\nTrabajamos con pedido anticipado de 48 horas. Tenemos opciones sin azúcar y sin lactosa. Entregamos en Casa Central y en el centro de Antofagasta.',
    rubro: 'Comida y repostería', logo: '#e87ba4', duenoId: 'u-8', dueno: 'Valentina Soto',
    carrera: 'Enfermería', campus: 'Coquimbo — Campus Guayacán', instagram: 'dulcenorte.ucn',
    whatsapp: '+56942118890', plan: 'pro', status: 'aprobado',
    catalogo: [
      { titulo: 'Torta de 20 personas', precio: 28000 },
      { titulo: 'Caja de 12 brownies', precio: 9000 },
      { titulo: 'Kuchen de frambuesa', precio: 14000 },
      { titulo: 'Mesa dulce para evento', nota: 'Cotización a medida' },
    ],
  },
  {
    id: 'e-2', nombre: 'Estudio Marea', lema: 'Fotografía de titulación y eventos de carrera',
    descripcion:
      'Fotografía y video para titulaciones, galas y actividades estudiantiles. Somos tres estudiantes de Periodismo y Arquitectura con equipo propio.\n\nEntregamos las fotos editadas en 5 días hábiles y un video resumen vertical para redes. Tenemos tarifa especial para centros de alumnos.',
    rubro: 'Fotografía y video', logo: '#2a78d6', duenoId: 'u-6', dueno: 'Camila Araya',
    carrera: 'Arquitectura', campus: 'Antofagasta — Campus Angamos', instagram: 'estudiomarea',
    tiktok: 'estudiomarea', web: 'https://estudiomarea.cl', plan: 'emprendedor', status: 'aprobado',
    catalogo: [
      { titulo: 'Sesión de titulación', precio: 55000 },
      { titulo: 'Cobertura de evento (4 h)', precio: 120000 },
      { titulo: 'Pack fotos para redes', precio: 35000 },
    ],
  },
  {
    id: 'e-3', nombre: 'Tejidos Atacama', lema: 'Lana teñida a mano en el desierto',
    descripcion:
      'Chalecos, gorros y mantas tejidos a mano con lana teñida con pigmentos naturales del norte. Cada pieza es única y tarda entre una y tres semanas.\n\nTambién hacemos talleres de tejido los sábados en el campus, abiertos a toda la comunidad UCN.',
    rubro: 'Arte y manualidades', logo: '#eb6834', duenoId: 'u-2', dueno: 'Constanza Álvarez',
    carrera: 'Biología Marina', campus: 'Coquimbo — Campus Guayacán', instagram: 'tejidos.atacama',
    plan: 'emprendedor', status: 'aprobado',
    catalogo: [
      { titulo: 'Gorro de lana', precio: 15000 },
      { titulo: 'Chaleco tejido', precio: 48000 },
      { titulo: 'Taller de tejido (3 h)', precio: 12000 },
    ],
  },
  {
    id: 'e-4', nombre: 'CodeaUCN', lema: 'Desarrollo web para emprendimientos chicos',
    descripcion:
      'Hacemos sitios web, tiendas online y automatizaciones para emprendimientos que están partiendo. Somos estudiantes de Computación e Informática y cobramos precios de estudiante.',
    rubro: 'Tecnología y desarrollo', logo: '#4a3aa7', duenoId: 'u-1', dueno: 'Matías Pizarro',
    carrera: 'Ingeniería en Computación e Informática', campus: 'Antofagasta — Casa Central',
    instagram: 'codea.ucn', web: 'https://codeaucn.dev', plan: 'emprendedor', status: 'aprobado',
    catalogo: [
      { titulo: 'Landing page', precio: 120000 },
      { titulo: 'Tienda online', precio: 280000 },
      { titulo: 'Mantención mensual', precio: 25000 },
    ],
  },
  {
    id: 'e-5', nombre: 'Café Sísmico', lema: 'Café de especialidad entre clases',
    descripcion: 'Carrito de café de especialidad que se instala en Casa Central de lunes a jueves. Grano de origen, leches vegetales disponibles.',
    rubro: 'Comida y repostería', logo: '#eda100', duenoId: 'u-3', dueno: 'Ignacio Tapia',
    carrera: 'Ingeniería Civil de Minas', campus: 'Antofagasta — Casa Central', instagram: 'cafesismico',
    plan: 'vitrina', status: 'aprobado',
  },
  {
    id: 'e-6', nombre: 'Uñas por Fer', lema: 'Manicure a domicilio o en el campus',
    descripcion: 'Manicure semipermanente y kapping. Atiendo en mi casa o voy al campus con cita previa.',
    rubro: 'Belleza y bienestar', logo: '#e34948', duenoId: 'u-4', dueno: 'Fernanda Muñoz',
    carrera: 'Psicología', campus: 'Antofagasta — Casa Central', instagram: 'unasporfer',
    plan: 'vitrina', status: 'aprobado',
  },
  {
    id: 'e-7', nombre: 'Preuniversitario Norte', lema: 'Preparación PAES por estudiantes UCN',
    descripcion:
      'Clases de preparación PAES en matemática y competencia lectora, dictadas por estudiantes de la UCN que rindieron hace poco. Grupos reducidos, material propio y ensayos quincenales corregidos.',
    rubro: 'Asesorías y educación', logo: '#1baf7a', duenoId: 'u-7', dueno: 'Sebastián Núñez',
    carrera: 'Ingeniería Comercial', campus: 'Antofagasta — Casa Central', instagram: 'preunorte.paes',
    plan: 'pro', status: 'aprobado',
    catalogo: [
      { titulo: 'Mensualidad matemática', precio: 35000 },
      { titulo: 'Mensualidad competencia lectora', precio: 30000 },
      { titulo: 'Ensayo corregido', precio: 5000 },
      { titulo: 'Plan intensivo verano', nota: 'Cupos limitados' },
    ],
  },
  {
    id: 'e-8', nombre: 'Segunda Vuelta', lema: 'Ropa usada curada, a precio de estudiante',
    descripcion: 'Tienda de ropa de segunda mano seleccionada. Publicamos drops los viernes por Instagram y entregamos en el campus.',
    rubro: 'Moda y accesorios', logo: '#199e70', duenoId: 'u-5', dueno: 'Diego Cortés',
    carrera: 'Derecho', campus: 'Coquimbo — Campus Guayacán', instagram: 'segundavuelta.cl',
    plan: 'vitrina', status: 'pendiente',
  },
]

const construirEmprendimientos = (r: () => number): Emprendimiento[] =>
  EMPRENDIMIENTOS_SEED.map((e, i) => {
    const creado = AHORA - (30 + i * 12) * DIA
    const diasRestantes = e.plan === 'vitrina' ? 3650 : [26, 12, 4, 18, 0, 0, 21, 0][i] || 30
    const hasta = AHORA + diasRestantes * DIA
    const status: Emprendimiento['suscripcionStatus'] =
      e.plan === 'vitrina'
        ? 'activa'
        : e.status === 'pendiente'
          ? 'pendiente-pago'
          : diasRestantes <= 0
            ? 'vencida'
            : diasRestantes <= 7
              ? 'por-vencer'
              : 'activa'
    const base = e.plan === 'pro' ? 1400 : e.plan === 'emprendedor' ? 700 : 260
    return {
      ...e,
      creadoEn: iso(creado),
      suscripcionHasta: iso(hasta),
      suscripcionStatus: status,
      stats: {
        vistas: Math.round(base * (0.7 + r() * 0.7)),
        clicsContacto: Math.round(base * (0.16 + r() * 0.14)),
        guardados: Math.round(base * 0.08 * (0.5 + r())),
        compartidos: Math.round(base * 0.04 * (0.5 + r())),
      },
      moderacion:
        e.status === 'aprobado'
          ? { revisadoPor: 'Comisión de Bienestar FEUCN', revisadoEn: iso(creado + HORA) }
          : undefined,
    }
  })

/**
 * Genera los eventos de los últimos 30 días a partir de los totales de cada
 * aviso, con una curva semanal (más movimiento de lunes a jueves) para que las
 * series temporales del panel se vean como datos reales.
 */
const construirEventos = (posts: Post[], emps: Emprendimiento[], r: () => number): AnalyticsEvent[] => {
  const eventos: AnalyticsEvent[] = []
  let n = 0
  const empujar = (kind: AnalyticsEvent['kind'], targetId: string, targetType: 'post' | 'emprendimiento', at: number, postType?: PostType) => {
    eventos.push({ id: `ev-${n++}`, kind, targetId, targetType, postType, at: iso(at) })
  }

  const pesoDia = (ms: number) => {
    const d = new Date(ms).getDay()
    return d === 0 ? 0.45 : d === 6 ? 0.6 : d === 5 ? 0.85 : 1.15
  }

  for (const p of posts) {
    if (p.status === 'pendiente' || p.status === 'rechazado') continue
    const inicio = new Date(p.publicadoEn ?? p.creadoEn).getTime()
    const fin = Math.min(AHORA, new Date(p.expiraEn).getTime())
    const ventana = Math.max(HORA, fin - inicio)
    const repartir = (total: number, kind: AnalyticsEvent['kind']) => {
      for (let i = 0; i < total; i++) {
        // Curva de decaimiento: la mayor parte del tráfico ocurre al inicio.
        const t = Math.pow(r(), 1.25)
        const at = inicio + t * ventana
        if (r() < pesoDia(at) - 0.35) empujar(kind, p.id, 'post', at, p.type)
      }
    }
    repartir(p.stats.vistas, 'vista')
    repartir(p.stats.clicsContacto, 'clic-contacto')
    repartir(p.stats.guardados, 'guardado')
    repartir(p.stats.compartidos, 'compartido')
    empujar('publicacion', p.id, 'post', inicio, p.type)
  }

  for (const e of emps) {
    if (e.status !== 'aprobado') continue
    const inicio = Math.max(new Date(e.creadoEn).getTime(), AHORA - 30 * DIA)
    const ventana = AHORA - inicio
    const repartir = (total: number, kind: AnalyticsEvent['kind']) => {
      for (let i = 0; i < total; i++) empujar(kind, e.id, 'emprendimiento', inicio + r() * ventana)
    }
    repartir(e.stats.vistas, 'vista')
    repartir(e.stats.clicsContacto, 'clic-contacto')
  }

  return eventos.sort((a, b) => a.at.localeCompare(b.at))
}

const REPORTES: Report[] = [
  {
    id: 'rep-1', postId: 'p-18', motivo: 'Parece una estafa',
    detalle: 'Pide transferencia antes de mostrar el producto y no responde cuando le preguntas por fotos reales.',
    creadoEn: iso(AHORA - 3 * HORA), reportadoPor: 'u-2', resuelto: false,
  },
  {
    id: 'rep-2', postId: 'p-17', motivo: 'No corresponde a la categoría',
    detalle: 'Esto es venta de trabajos académicos, no un servicio.',
    creadoEn: iso(AHORA - 8 * HORA), reportadoPor: 'u-4', resuelto: false,
  },
  {
    id: 'rep-3', postId: 'p-8', motivo: 'Publicación duplicada',
    detalle: 'Está publicada dos veces con distinto precio.',
    creadoEn: iso(AHORA - 30 * HORA), reportadoPor: 'u-1', resuelto: true,
  },
]

const SOLICITUDES: SolicitudPlan[] = [
  {
    id: 'sol-1', emprendimientoId: 'e-8', emprendimiento: 'Segunda Vuelta', plan: 'emprendedor',
    solicitanteId: 'u-5', solicitante: 'Diego Cortés', correo: 'diego.cortes@alumnos.ucn.cl',
    meses: 3, creadoEn: iso(AHORA - 5 * HORA), status: 'pendiente',
  },
  {
    id: 'sol-2', emprendimientoId: 'e-5', emprendimiento: 'Café Sísmico', plan: 'pro',
    solicitanteId: 'u-3', solicitante: 'Ignacio Tapia', correo: 'ignacio.tapia@alumnos.ucn.cl',
    meses: 1, creadoEn: iso(AHORA - 28 * HORA), status: 'pendiente',
  },
  {
    id: 'sol-3', emprendimientoId: 'e-2', emprendimiento: 'Estudio Marea', plan: 'emprendedor',
    solicitanteId: 'u-6', solicitante: 'Camila Araya', correo: 'camila.araya@alumnos.ucn.cl',
    meses: 6, creadoEn: iso(AHORA - 12 * DIA), status: 'confirmada',
    nota: 'Pago recibido en tesorería FEUCN, comprobante 2291.',
  },
]

export const crearBaseDemo = (): Database => {
  const r = rng(20260922)
  const posts = [...SEMILLAS.map((s) => construirPost(s, r)), ...construirHistoricos(r)]
  const emprendimientos = construirEmprendimientos(r)
  return {
    version: 4,
    posts,
    emprendimientos,
    eventos: construirEventos(posts, emprendimientos, r),
    reportes: REPORTES,
    solicitudes: SOLICITUDES,
    usuarios: USUARIOS,
    guardados: ['p-6', 'p-15'],
    sesionUserId: 'u-demo',
  }
}
