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

export type Campus =
  | 'Antofagasta — Casa Central'
  | 'Antofagasta — Campus Angamos'
  | 'Coquimbo — Campus Guayacán'
  | 'Fuera del campus'

export type ContactChannel = 'whatsapp' | 'correo' | 'instagram'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface PostLocation {
  campus: Campus
  /** Punto de encuentro sugerido: "Biblioteca", "Casino central", etc. */
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
  campus: Campus
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

export type Role = 'visitante' | 'estudiante' | 'moderador'

export interface User {
  id: string
  nombre: string
  correo: string
  carrera: string
  campus: Campus
  role: Role
  avatar: string
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
  /** Avisos que el usuario actual guardó (solo local). */
  guardados: string[]
  sesionUserId: string | null
}
