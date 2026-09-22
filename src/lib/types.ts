/**
 * Modelo de dominio de la Bolsa de Trabajo FEUCN.
 *
 * Este archivo es la fuente de verdad compartida entre el frontend y el
 * backend futuro: los nombres de campos coinciden 1:1 con los payloads que
 * `src/lib/api.ts` enviaría a una API REST real.
 */

export type PostType = 'trabajo' | 'venta' | 'perdido'

export type PostStatus =
  | 'pendiente'   // en cola de moderación
  | 'aprobado'    // visible en el feed
  | 'rechazado'   // moderado con motivo
  | 'expirado'    // superó los 5 días de vigencia
  | 'archivado'   // cerrado por su autor (vendido / cubierto / devuelto)

/**
 * La bolsa opera solo en Antofagasta y con un único campus, así que la
 * ubicación no distingue sedes: lo que importa es el punto de encuentro.
 */
export type TipoLugar = 'campus' | 'fuera'

export type ContactChannel = 'whatsapp' | 'correo' | 'instagram'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface PostLocation {
  /** Dentro del campus o en la ciudad. */
  tipo: TipoLugar
  /** Punto de encuentro sugerido: "Biblioteca central", "Casino", etc. */
  zona: string
  /** Referencia libre escrita por el autor. */
  referencia?: string
  punto: GeoPoint
}

export interface PostContact {
  nombre: string
  carrera: string
  correo: string
  whatsapp?: string
  instagram?: string
  preferido: ContactChannel
}

export interface PostStats {
  /** Veces que se abrió el detalle del aviso. */
  vistas: number
  /** Veces que alguien pulsó "Ver contacto" — la métrica que importa. */
  clicsContacto: number
  guardados: number
  compartidos: number
}

export interface ModerationRecord {
  revisadoPor: string
  revisadoEn: string
  motivo?: string
  nota?: string
}

export interface Report {
  id: string
  postId: string
  motivo: string
  detalle?: string
  creadoEn: string
  reportadoPor: string
  resuelto: boolean
}

/** Subtipo exclusivo del foro "¿Se perdió esto?". */
export type LostKind = 'perdido' | 'encontrado'

export interface Post {
  id: string
  type: PostType
  titulo: string
  descripcion: string
  /** Referencial y solo informativo: la plataforma no procesa pagos. */
  precio?: number
  /** "Conversable", "Gratis", "Por hora", etc. */
  precioNota?: string
  categoria: string
  estadoArticulo?: 'nuevo' | 'como-nuevo' | 'usado'
  imagenes: string[]
  ubicacion: PostLocation
  contacto: PostContact
  autorId: string
  creadoEn: string
  publicadoEn?: string
  /** Máximo 5 días desde la aprobación. Regla dura del reglamento FEUCN. */
  expiraEn: string
  diasVigencia: number
  renovaciones: number
  status: PostStatus
  moderacion?: ModerationRecord
  stats: PostStats
  /** Puntaje automático 0–100 calculado al publicar; alimenta la cola. */
  riesgo: number
  banderas: string[]
  /** Solo para el foro de objetos perdidos. */
  lostKind?: LostKind
  resuelto?: boolean
  /** Respuestas del foro (pistas, "yo lo vi en...", etc.). */
  respuestas?: ForumReply[]
}

export interface ForumReply {
  id: string
  autor: string
  carrera?: string
  mensaje: string
  creadoEn: string
}

export type PlanId = 'vitrina' | 'emprendedor' | 'pro'

export interface Plan {
  id: PlanId
  nombre: string
  precioMensual: number
  descripcion: string
  beneficios: string[]
  limiteCaracteres: number
  destacado: boolean
}

export type SubscriptionStatus = 'activa' | 'por-vencer' | 'vencida' | 'pendiente-pago'

export interface Emprendimiento {
  id: string
  nombre: string
  lema: string
  descripcion: string
  rubro: string
  logo: string
  /** Portada opcional en el perfil extendido (planes pagados). */
  portada?: string
  instagram?: string
  tiktok?: string
  web?: string
  whatsapp?: string
  duenoId: string
  dueno: string
  carrera: string
  plan: PlanId
  suscripcionHasta: string
  suscripcionStatus: SubscriptionStatus
  status: PostStatus
  creadoEn: string
  stats: PostStats
  /** Solo visible en planes pagados. */
  catalogo?: { titulo: string; precio?: number; nota?: string }[]
  moderacion?: ModerationRecord
}

/** Evento atómico de analítica. El backend lo escribiría en una tabla append-only. */
export type EventKind = 'vista' | 'clic-contacto' | 'guardado' | 'compartido' | 'publicacion'

export interface AnalyticsEvent {
  id: string
  kind: EventKind
  /** id del aviso o del emprendimiento. */
  targetId: string
  targetType: 'post' | 'emprendimiento'
  postType?: PostType
  at: string
}

export type Role = 'visitante' | 'estudiante' | 'moderador' | 'admin'

/** Credenciales de acceso al panel. Las cuentas se crean solo desde el backend. */
export interface Credenciales {
  usuario: string
  clave: string
}

export interface User {
  id: string
  nombre: string
  correo: string
  carrera: string
  role: Role
  avatar: string
}

/** Una cuenta vista desde el panel, con cuánto tiene publicado. */
export interface CuentaPanel extends User {
  creadoEn: string
  suspendido: boolean
  suspendidoEn?: string
  motivoSuspension?: string
  ultimoIngreso?: string
  correoConfirmado: boolean
  avisos: number
  avisosActivos: number
  respuestas: number
  emprendimientos: number
}

/** Lo que se retiró del sitio al suspender o eliminar una cuenta. */
export interface ContenidoBorrado {
  avisos: number
  respuestas: number
  emprendimientos: number
  postulaciones: number
  reportes: number
}

export interface SolicitudPlan {
  id: string
  emprendimientoId: string
  emprendimiento: string
  plan: PlanId
  solicitanteId: string
  solicitante: string
  correo: string
  meses: number
  creadoEn: string
  status: 'pendiente' | 'confirmada' | 'rechazada'
  nota?: string
}

export interface Database {
  version: number
  posts: Post[]
  emprendimientos: Emprendimiento[]
  eventos: AnalyticsEvent[]
  reportes: Report[]
  solicitudes: SolicitudPlan[]
  usuarios: User[]
  ferias: Feria[]
  postulaciones: PostulacionFeria[]
  /** Avisos que el usuario actual guardó (solo local). */
  guardados: string[]
  sesionUserId: string | null
}

/* ── Ferias de emprendimiento ─────────────────────────────────────────────
   La federación arma ferias cada cierto tiempo. La postulación se abre, se
   llena hasta el cupo definido y se cierra sola; después la administración
   selecciona, sortea los puestos y avisa por correo.                        */

export type EstadoFeria = 'borrador' | 'abierta' | 'cerrada' | 'finalizada'

export interface Feria {
  id: string
  nombre: string
  descripcion: string
  /** Día del evento. */
  fecha: string
  lugar: string
  /** Al llegar a esta cantidad de postulaciones, la convocatoria se cierra sola. */
  cupos: number
  /** Puestos físicos disponibles para sortear entre los seleccionados. */
  puestos: number
  /** Aporte de inscripción en pesos. Se paga en la oficina, no en el sitio. */
  montoInscripcion: number
  /** Además del aporte, se pide un alimento no perecible. */
  pideAlimento: boolean
  estado: EstadoFeria
  abiertaDesde?: string
  cerradaEn?: string
  creadoEn: string
}

export type EstadoPostulacion = 'recibida' | 'seleccionada' | 'no-seleccionada'

export interface PostulacionFeria {
  id: string
  feriaId: string
  nombreCompleto: string
  correo: string
  carrera: string
  /** RUT con dígito verificador, validado al postular. */
  rut: string
  /** Avance curricular declarado, en porcentaje. */
  avanceCurricular: number
  nombreEmprendimiento: string
  descripcionBreve: string
  /**
   * Los emprendimientos MAPAU quedan fuera del sorteo: su puesto lo asigna la
   * administración a mano.
   */
  esMapau: boolean
  aceptaCondiciones: boolean
  creadoEn: string
  estado: EstadoPostulacion
  /** Número de puesto asignado por sorteo, o a mano si es MAPAU. */
  puesto?: number
  /** Control en terreno el día de la feria. */
  pagoInscripcion: boolean
  entregaAlimento: boolean
  /** Cuándo se le avisó que quedó seleccionado. */
  avisadoEn?: string
}
