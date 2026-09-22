/**
 * Traducción entre las filas de Supabase y el modelo de dominio.
 *
 * La base usa snake_case y columnas planas; la aplicación usa camelCase y
 * objetos anidados. Todo ese doblez vive acá para que ni las páginas ni
 * `api.ts` tengan que saber cómo se llaman las columnas.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { TABLAS } from './supabase'
import type {
  AnalyticsEvent,
  Emprendimiento,
  Feria,
  Post,
  PostulacionFeria,
  Report,
  SolicitudPlan,
} from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Fila = Record<string, any>

/* ── Lectura: fila → dominio ────────────────────────────────────────────── */

export const filaAPost = (f: Fila): Post => ({
  id: f.id,
  type: f.tipo,
  titulo: f.titulo,
  descripcion: f.descripcion,
  precio: f.precio ?? undefined,
  precioNota: f.precio_nota ?? undefined,
  categoria: f.categoria,
  estadoArticulo: f.estado_articulo ?? undefined,
  imagenes: f.imagenes ?? [],
  ubicacion: {
    tipo: f.lugar_tipo,
    zona: f.lugar_zona,
    referencia: f.lugar_referencia ?? undefined,
    punto: { lat: f.lat, lng: f.lng },
  },
  contacto: {
    nombre: f.contacto_nombre,
    carrera: f.contacto_carrera,
    correo: f.contacto_correo,
    whatsapp: f.contacto_whatsapp ?? undefined,
    instagram: f.contacto_instagram ?? undefined,
    preferido: f.contacto_preferido,
  },
  autorId: f.autor_id ?? '',
  creadoEn: f.creado_en,
  publicadoEn: f.publicado_en ?? undefined,
  expiraEn: f.expira_en ?? f.creado_en,
  diasVigencia: f.dias_vigencia,
  renovaciones: f.renovaciones,
  status: f.status,
  moderacion: f.moderado_en
    ? {
        revisadoPor: f.moderado_por ?? 'Moderación FEUCN',
        revisadoEn: f.moderado_en,
        motivo: f.motivo_rechazo ?? undefined,
        nota: f.nota_moderacion ?? undefined,
      }
    : undefined,
  stats: {
    vistas: f.vistas ?? 0,
    clicsContacto: f.clics_contacto ?? 0,
    guardados: f.guardados ?? 0,
    compartidos: f.compartidos ?? 0,
  },
  riesgo: f.riesgo ?? 0,
  banderas: f.banderas ?? [],
  lostKind: f.lost_kind ?? undefined,
  resuelto: f.resuelto ?? false,
  respuestas: (f.respuestas_foro ?? []).map((r: Fila) => ({
    id: r.id,
    autor: r.autor_nombre,
    carrera: r.autor_carrera ?? undefined,
    mensaje: r.mensaje,
    creadoEn: r.creado_en,
  })),
})

export const filaAEmprendimiento = (f: Fila): Emprendimiento => {
  const restante = f.suscripcion_hasta ? new Date(f.suscripcion_hasta).getTime() - Date.now() : Infinity
  return {
    id: f.id,
    nombre: f.nombre,
    lema: f.lema,
    descripcion: f.descripcion,
    rubro: f.rubro,
    logo: f.logo,
    portada: f.portada ?? undefined,
    instagram: f.instagram ?? undefined,
    tiktok: f.tiktok ?? undefined,
    web: f.web ?? undefined,
    whatsapp: f.whatsapp ?? undefined,
    duenoId: f.dueno_id ?? '',
    dueno: f.dueno,
    carrera: f.carrera,
    plan: f.plan,
    suscripcionHasta: f.suscripcion_hasta ?? new Date().toISOString(),
    suscripcionStatus:
      f.plan === 'vitrina'
        ? 'activa'
        : f.status === 'pendiente'
          ? 'pendiente-pago'
          : restante <= 0
            ? 'vencida'
            : restante <= 7 * 86_400_000
              ? 'por-vencer'
              : 'activa',
    status: f.status,
    creadoEn: f.creado_en,
    stats: {
      vistas: f.vistas ?? 0,
      clicsContacto: f.clics_contacto ?? 0,
      guardados: 0,
      compartidos: 0,
    },
    catalogo: f.catalogo ?? [],
  }
}

export const filaAFeria = (f: Fila): Feria => ({
  id: f.id,
  nombre: f.nombre,
  descripcion: f.descripcion,
  fecha: f.fecha,
  lugar: f.lugar,
  cupos: f.cupos,
  puestos: f.puestos,
  montoInscripcion: f.monto_inscripcion,
  pideAlimento: f.pide_alimento,
  estado: f.estado,
  abiertaDesde: f.abierta_desde ?? undefined,
  cerradaEn: f.cerrada_en ?? undefined,
  creadoEn: f.creado_en,
})

export const filaAPostulacion = (f: Fila): PostulacionFeria => ({
  id: f.id,
  feriaId: f.feria_id,
  nombreCompleto: f.nombre_completo,
  correo: f.correo,
  carrera: f.carrera,
  rut: f.rut,
  avanceCurricular: f.avance_curricular,
  nombreEmprendimiento: f.nombre_emprendimiento,
  descripcionBreve: f.descripcion_breve,
  esMapau: f.es_mapau,
  aceptaCondiciones: f.acepta_condiciones,
  creadoEn: f.creado_en,
  estado: f.estado,
  puesto: f.puesto ?? undefined,
  pagoInscripcion: f.pago_inscripcion,
  entregaAlimento: f.entrega_alimento,
  avisadoEn: f.avisado_en ?? undefined,
})

export const filaAReporte = (f: Fila): Report => ({
  id: f.id,
  postId: f.aviso_id,
  motivo: f.motivo,
  detalle: f.detalle ?? undefined,
  creadoEn: f.creado_en,
  reportadoPor: f.reportado_por ?? 'anónimo',
  resuelto: f.resuelto,
})

export const filaASolicitud = (f: Fila): SolicitudPlan => ({
  id: f.id,
  emprendimientoId: f.emprendimiento_id,
  emprendimiento: f.emprendimientos?.nombre ?? 'Emprendimiento',
  plan: f.plan,
  solicitanteId: f.solicitante_id ?? '',
  solicitante: f.solicitante,
  correo: f.correo,
  meses: f.meses,
  creadoEn: f.creado_en,
  status: f.status,
  nota: f.nota ?? undefined,
})

export const filaAEvento = (f: Fila): AnalyticsEvent => ({
  id: String(f.id),
  kind: f.kind,
  targetId: f.target_id,
  targetType: f.target_type,
  postType: f.post_type ?? undefined,
  at: f.at,
})

/* ── Escritura: dominio → fila ──────────────────────────────────────────── */

export const postAFila = (p: Omit<Post, 'id'>): Fila => ({
  tipo: p.type,
  titulo: p.titulo,
  descripcion: p.descripcion,
  precio: p.precio ?? null,
  precio_nota: p.precioNota ?? null,
  categoria: p.categoria,
  estado_articulo: p.estadoArticulo ?? null,
  imagenes: p.imagenes,
  lugar_tipo: p.ubicacion.tipo,
  lugar_zona: p.ubicacion.zona,
  lugar_referencia: p.ubicacion.referencia ?? null,
  lat: p.ubicacion.punto.lat,
  lng: p.ubicacion.punto.lng,
  contacto_nombre: p.contacto.nombre,
  contacto_carrera: p.contacto.carrera,
  contacto_correo: p.contacto.correo,
  contacto_whatsapp: p.contacto.whatsapp ?? null,
  contacto_instagram: p.contacto.instagram ?? null,
  contacto_preferido: p.contacto.preferido,
  autor_id: p.autorId || null,
  dias_vigencia: p.diasVigencia,
  status: p.status,
  riesgo: p.riesgo,
  banderas: p.banderas,
  lost_kind: p.lostKind ?? null,
  resuelto: p.resuelto ?? false,
})

export const feriaAFila = (f: Omit<Feria, 'id' | 'creadoEn'>): Fila => ({
  nombre: f.nombre,
  descripcion: f.descripcion,
  fecha: f.fecha,
  lugar: f.lugar,
  cupos: f.cupos,
  puestos: f.puestos,
  monto_inscripcion: f.montoInscripcion,
  pide_alimento: f.pideAlimento,
  estado: f.estado,
  abierta_desde: f.abiertaDesde ?? null,
  cerrada_en: f.cerradaEn ?? null,
})

export const postulacionAFila = (
  p: Pick<
    PostulacionFeria,
    | 'feriaId'
    | 'nombreCompleto'
    | 'correo'
    | 'carrera'
    | 'rut'
    | 'avanceCurricular'
    | 'nombreEmprendimiento'
    | 'descripcionBreve'
    | 'esMapau'
    | 'aceptaCondiciones'
  >,
): Fila => ({
  feria_id: p.feriaId,
  nombre_completo: p.nombreCompleto,
  correo: p.correo,
  carrera: p.carrera,
  rut: p.rut,
  avance_curricular: p.avanceCurricular,
  nombre_emprendimiento: p.nombreEmprendimiento,
  descripcion_breve: p.descripcionBreve,
  es_mapau: p.esMapau,
  acepta_condiciones: p.aceptaCondiciones,
})

export const emprendimientoAFila = (e: Omit<Emprendimiento, 'id' | 'creadoEn' | 'stats' | 'status' | 'suscripcionHasta' | 'suscripcionStatus'>): Fila => ({
  nombre: e.nombre,
  lema: e.lema,
  descripcion: e.descripcion,
  rubro: e.rubro,
  logo: e.logo,
  instagram: e.instagram ?? null,
  tiktok: e.tiktok ?? null,
  web: e.web ?? null,
  whatsapp: e.whatsapp ?? null,
  dueno_id: e.duenoId || null,
  dueno: e.dueno,
  carrera: e.carrera,
  plan: e.plan,
  status: 'pendiente',
  catalogo: e.catalogo ?? [],
})

/* ── Descarga completa ──────────────────────────────────────────────────── */

export interface Instantanea {
  posts: Post[]
  emprendimientos: Emprendimiento[]
  ferias: Feria[]
  postulaciones: PostulacionFeria[]
  reportes: Report[]
  solicitudes: SolicitudPlan[]
  eventos: AnalyticsEvent[]
}

/**
 * Trae de una vez lo que la aplicación necesita para funcionar.
 *
 * RLS decide qué vuelve: una visita anónima recibe los avisos publicados y las
 * ferias; el equipo recibe además la cola, los reportes y las postulaciones.
 * Por eso no hay que filtrar por rol acá — si una consulta no devuelve nada, es
 * porque esa persona no tenía por qué verlo.
 */
export const traerTodo = async (sb: SupabaseClient): Promise<Instantanea> => {
  const vacio = <T,>(r: { data: T[] | null }) => r.data ?? []

  const [avisos, emprendimientos, ferias, postulaciones, reportes, solicitudes, eventos] = await Promise.all([
    sb.from(TABLAS.avisos).select('*, respuestas_foro(*)').order('creado_en', { ascending: false }).limit(500),
    sb.from(TABLAS.emprendimientos).select('*').order('creado_en', { ascending: false }).limit(200),
    sb.from(TABLAS.ferias).select('*').order('creado_en', { ascending: false }).limit(50),
    sb.from(TABLAS.postulaciones).select('*').order('creado_en', { ascending: true }).limit(500),
    sb.from(TABLAS.reportes).select('*').order('creado_en', { ascending: false }).limit(200),
    sb.from(TABLAS.solicitudes).select('*, emprendimientos(nombre)').order('creado_en', { ascending: false }).limit(200),
    // Los eventos son el volumen: solo los últimos 30 días alimentan los gráficos.
    sb
      .from(TABLAS.eventos)
      .select('*')
      .gte('at', new Date(Date.now() - 30 * 86_400_000).toISOString())
      .order('at', { ascending: true })
      .limit(20000),
  ])

  return {
    posts: vacio(avisos).map(filaAPost),
    emprendimientos: vacio(emprendimientos).map(filaAEmprendimiento),
    ferias: vacio(ferias).map(filaAFeria),
    postulaciones: vacio(postulaciones).map(filaAPostulacion),
    reportes: vacio(reportes).map(filaAReporte),
    solicitudes: vacio(solicitudes).map(filaASolicitud),
    eventos: vacio(eventos).map(filaAEvento),
  }
}
