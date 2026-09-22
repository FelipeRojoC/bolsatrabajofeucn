/**
 * Capa de datos.
 *
 * Hoy persiste en localStorage y responde de forma asíncrona a propósito: cada
 * función de este archivo tiene la firma que tendría contra una API REST real,
 * así que migrar al backend es reemplazar el cuerpo por un `fetch` sin tocar
 * ningún componente.
 *
 *   listarPosts(f)        → GET    /api/avisos?tipo=…&campus=…
 *   crearPost(draft)      → POST   /api/avisos
 *   moderarPost(id, …)    → PATCH  /api/avisos/:id/moderacion
 *   registrarEvento(…)    → POST   /api/eventos
 */
import { MAX_DIAS_VIGENCIA, MAX_RENOVACIONES, TERMINOS_RIESGO } from './constants'
import { normalizar } from './format'
import { limpiarRut } from './rut'
import { credencialesValidas } from './auth'
import { crearBaseDemo } from './seed'
import type {
  AnalyticsEvent,
  Database,
  Emprendimiento,
  EventKind,
  Feria,
  PlanId,
  PostulacionFeria,
  Post,
  PostStatus,
  PostType,
  Report,
  SolicitudPlan,
  TipoLugar,
  User,
} from './types'

const CLAVE = 'feucn-bolsa-v1'
const DIA = 86_400_000

let cache: Database | null = null
const oyentes = new Set<() => void>()

const leer = (): Database => {
  if (cache) return cache
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) {
      const parsed = JSON.parse(crudo) as Database
      if (parsed.version === 7) {
        cache = parsed
        return cache
      }
    }
  } catch {
    // Storage bloqueado (modo privado) o JSON corrupto: se parte de la demo.
  }
  cache = crearBaseDemo()
  escribir(cache)
  return cache
}

const escribir = (db: Database) => {
  cache = db
  try {
    localStorage.setItem(CLAVE, JSON.stringify(db))
  } catch {
    // Sin persistencia la app sigue funcionando en memoria durante la sesión.
  }
}

const notificar = () => oyentes.forEach((fn) => fn())

export const suscribir = (fn: () => void) => {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

/** Simula latencia de red para que los estados de carga sean reales. */
const demora = <T,>(valor: T, ms = 140): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(valor), ms))

const id = (prefijo: string) => `${prefijo}-${Math.random().toString(36).slice(2, 9)}`

// ── Vigencia ────────────────────────────────────────────────────────────────

/**
 * Marca como expirado todo aviso aprobado cuya ventana de 5 días ya pasó.
 * En el backend esto sería un job programado; acá corre en cada lectura.
 */
export const barrerExpirados = (): number => {
  const db = leer()
  const ahora = Date.now()
  let cambios = 0
  for (const p of db.posts) {
    if (p.status === 'aprobado' && new Date(p.expiraEn).getTime() <= ahora) {
      p.status = 'expirado'
      cambios++
    }
  }
  for (const e of db.emprendimientos) {
    if (e.plan !== 'vitrina' && e.suscripcionStatus !== 'pendiente-pago') {
      const restante = new Date(e.suscripcionHasta).getTime() - ahora
      e.suscripcionStatus = restante <= 0 ? 'vencida' : restante <= 7 * DIA ? 'por-vencer' : 'activa'
    }
  }
  if (cambios) {
    escribir(db)
    notificar()
  }
  return cambios
}

// ── Riesgo automático ───────────────────────────────────────────────────────

/**
 * Puntaje 0–100 que ordena la cola de moderación. No bloquea nada: solo hace
 * que lo sospechoso se revise primero.
 */
export const evaluarRiesgo = (titulo: string, descripcion: string, precio?: number) => {
  const texto = normalizar(`${titulo} ${descripcion}`)
  let riesgo = 0
  const banderas = new Set<string>()

  for (const { termino, peso, bandera } of TERMINOS_RIESGO) {
    if (texto.includes(normalizar(termino))) {
      riesgo += peso
      banderas.add(bandera)
    }
  }
  if (precio !== undefined && precio > 500_000) {
    riesgo += 15
    banderas.add('Monto alto para una bolsa estudiantil')
  }
  if (descripcion.trim().length < 60) {
    riesgo += 10
    banderas.add('Descripción muy breve')
  }
  if (/(\d[\s.-]?){9,}/.test(descripcion) && !/whatsapp|fono|celular|\+56/i.test(descripcion)) {
    riesgo += 5
    banderas.add('Números sin contexto en la descripción')
  }

  return { riesgo: Math.min(100, riesgo), banderas: [...banderas] }
}

// ── Sesión ──────────────────────────────────────────────────────────────────

export const obtenerSesion = (): User | null => {
  const db = leer()
  return db.usuarios.find((u) => u.id === db.sesionUserId) ?? null
}

export const iniciarSesion = async (userId: string | null) => {
  const db = leer()
  db.sesionUserId = userId
  escribir(db)
  notificar()
  return demora(obtenerSesion(), 80)
}

export const listarUsuarios = () => leer().usuarios

/** Usuarios que se ofrecen en el menú de demostración (el admin entra por clave). */
export const listarUsuariosDemo = () => leer().usuarios.filter((u) => u.role !== 'admin')

/**
 * Ingreso al panel con usuario y clave.
 *
 * Hoy compara contra la credencial local de `auth.ts`. Con Supabase conectado,
 * esta función se reemplaza por `supabase.auth.signInWithPassword` y las
 * cuentas dejan de existir en el cliente.
 */
export const iniciarSesionAdmin = async (
  usuario: string,
  clave: string,
): Promise<{ ok: true; user: User } | { ok: false; motivo: string }> => {
  if (!credencialesValidas(usuario, clave)) {
    return demora({ ok: false, motivo: 'Usuario o clave incorrectos.' } as const, 500)
  }
  const db = leer()
  const admin = db.usuarios.find((u) => u.role === 'admin')
  if (!admin) return demora({ ok: false, motivo: 'No hay cuenta de administración configurada.' } as const)
  db.sesionUserId = admin.id
  escribir(db)
  notificar()
  return demora({ ok: true, user: admin } as const, 300)
}

// ── Avisos ──────────────────────────────────────────────────────────────────

export interface FiltrosPost {
  tipos?: PostType[]
  /** 'campus' o 'fuera': dónde se coordina la entrega. */
  lugares?: TipoLugar[]
  zonas?: string[]
  categorias?: string[]
  busqueda?: string
  precioMax?: number
  soloGratis?: boolean
  orden?: 'recientes' | 'por-expirar' | 'populares' | 'precio-asc' | 'precio-desc'
  status?: PostStatus[]
  autorId?: string
  lostKind?: Post['lostKind']
  incluirResueltos?: boolean
}

const ordenar = (posts: Post[], orden: FiltrosPost['orden']): Post[] => {
  const copia = [...posts]
  switch (orden) {
    case 'por-expirar':
      return copia.sort((a, b) => new Date(a.expiraEn).getTime() - new Date(b.expiraEn).getTime())
    case 'populares':
      return copia.sort((a, b) => b.stats.clicsContacto - a.stats.clicsContacto)
    case 'precio-asc':
      return copia.sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity))
    case 'precio-desc':
      return copia.sort((a, b) => (b.precio ?? -1) - (a.precio ?? -1))
    default:
      return copia.sort(
        (a, b) =>
          new Date(b.publicadoEn ?? b.creadoEn).getTime() - new Date(a.publicadoEn ?? a.creadoEn).getTime(),
      )
  }
}

export const filtrarPosts = (posts: Post[], f: FiltrosPost = {}): Post[] => {
  const estados = f.status ?? ['aprobado']
  const q = f.busqueda ? normalizar(f.busqueda) : ''

  const filtrados = posts.filter((p) => {
    if (!estados.includes(p.status)) return false
    if (f.tipos?.length && !f.tipos.includes(p.type)) return false
    if (f.lugares?.length && !f.lugares.includes(p.ubicacion.tipo)) return false
    if (f.zonas?.length && !f.zonas.includes(p.ubicacion.zona)) return false
    if (f.categorias?.length && !f.categorias.includes(p.categoria)) return false
    if (f.autorId && p.autorId !== f.autorId) return false
    if (f.lostKind && p.lostKind !== f.lostKind) return false
    if (!f.incluirResueltos && p.resuelto && f.lostKind === undefined && p.type === 'perdido') {
      // Los casos cerrados se siguen mostrando, pero al final del listado.
    }
    if (f.soloGratis && p.precio !== 0) return false
    if (f.precioMax !== undefined && (p.precio ?? 0) > f.precioMax) return false
    if (q) {
      const heno = normalizar(
        `${p.titulo} ${p.descripcion} ${p.categoria} ${p.ubicacion.zona} ${p.contacto.carrera}`,
      )
      if (!q.split(/\s+/).every((t) => heno.includes(t))) return false
    }
    return true
  })

  const ordenados = ordenar(filtrados, f.orden)
  // Un caso del foro ya resuelto nunca va arriba de uno abierto.
  return ordenados.sort((a, b) => Number(Boolean(a.resuelto)) - Number(Boolean(b.resuelto)))
}

export const listarPosts = async (f: FiltrosPost = {}): Promise<Post[]> => {
  barrerExpirados()
  return demora(filtrarPosts(leer().posts, f))
}

export const obtenerPost = (postId: string): Post | undefined =>
  leer().posts.find((p) => p.id === postId)

/** Todos los avisos, sin filtrar. Lo usan el panel y las comparativas. */
export const listarTodos = (): Post[] => leer().posts

export type BorradorPost = Omit<
  Post,
  'id' | 'creadoEn' | 'publicadoEn' | 'expiraEn' | 'status' | 'stats' | 'riesgo' | 'banderas' | 'renovaciones' | 'moderacion'
> & { diasVigencia: number }

export const crearPost = async (borrador: BorradorPost): Promise<Post> => {
  const db = leer()
  const dias = Math.min(MAX_DIAS_VIGENCIA, Math.max(1, borrador.diasVigencia))
  const { riesgo, banderas } = evaluarRiesgo(borrador.titulo, borrador.descripcion, borrador.precio)
  const ahora = Date.now()

  const nuevo: Post = {
    ...borrador,
    id: id('p'),
    diasVigencia: dias,
    creadoEn: new Date(ahora).toISOString(),
    // La ventana de vigencia se cuenta desde la aprobación, no desde el envío.
    expiraEn: new Date(ahora + dias * DIA).toISOString(),
    status: 'pendiente',
    renovaciones: 0,
    stats: { vistas: 0, clicsContacto: 0, guardados: 0, compartidos: 0 },
    riesgo,
    banderas,
  }

  db.posts.unshift(nuevo)
  escribir(db)
  notificar()
  return demora(nuevo, 400)
}

export const moderarPost = async (
  postId: string,
  accion: 'aprobar' | 'rechazar',
  opciones: { revisadoPor: string; motivo?: string; nota?: string } = { revisadoPor: 'Moderación FEUCN' },
): Promise<Post | undefined> => {
  const db = leer()
  const post = db.posts.find((p) => p.id === postId)
  if (!post) return demora(undefined)

  const ahora = Date.now()
  post.status = accion === 'aprobar' ? 'aprobado' : 'rechazado'
  post.moderacion = {
    revisadoPor: opciones.revisadoPor,
    revisadoEn: new Date(ahora).toISOString(),
    motivo: opciones.motivo,
    nota: opciones.nota,
  }
  if (accion === 'aprobar') {
    post.publicadoEn = new Date(ahora).toISOString()
    post.expiraEn = new Date(ahora + post.diasVigencia * DIA).toISOString()
    db.eventos.push({
      id: id('ev'),
      kind: 'publicacion',
      targetId: post.id,
      targetType: 'post',
      postType: post.type,
      at: new Date(ahora).toISOString(),
    })
  }
  // Resolver el aviso cierra sus reportes abiertos.
  db.reportes.filter((r) => r.postId === postId).forEach((r) => (r.resuelto = true))

  escribir(db)
  notificar()
  return demora(post, 200)
}

export const renovarPost = async (postId: string): Promise<{ ok: boolean; motivo?: string; post?: Post }> => {
  const db = leer()
  const post = db.posts.find((p) => p.id === postId)
  if (!post) return demora({ ok: false, motivo: 'El aviso ya no existe.' })
  if (post.renovaciones >= MAX_RENOVACIONES) {
    return demora({ ok: false, motivo: 'Este aviso ya usó su única renovación. Publícalo de nuevo si sigue vigente.' })
  }
  post.renovaciones += 1
  post.status = 'aprobado'
  post.expiraEn = new Date(Date.now() + post.diasVigencia * DIA).toISOString()
  escribir(db)
  notificar()
  return demora({ ok: true, post }, 250)
}

export const archivarPost = async (postId: string, resuelto = true): Promise<Post | undefined> => {
  const db = leer()
  const post = db.posts.find((p) => p.id === postId)
  if (!post) return demora(undefined)
  post.status = 'archivado'
  post.resuelto = resuelto
  escribir(db)
  notificar()
  return demora(post, 200)
}

export const responderForo = async (postId: string, autor: string, carrera: string, mensaje: string) => {
  const db = leer()
  const post = db.posts.find((p) => p.id === postId)
  if (!post) return demora(undefined)
  post.respuestas = [
    ...(post.respuestas ?? []),
    { id: id('r'), autor, carrera, mensaje, creadoEn: new Date().toISOString() },
  ]
  escribir(db)
  notificar()
  return demora(post, 200)
}

export const marcarResuelto = async (postId: string, resuelto: boolean) => {
  const db = leer()
  const post = db.posts.find((p) => p.id === postId)
  if (!post) return demora(undefined)
  post.resuelto = resuelto
  escribir(db)
  notificar()
  return demora(post, 150)
}

// ── Guardados (favoritos locales) ───────────────────────────────────────────

export const alternarGuardado = (postId: string): boolean => {
  const db = leer()
  const estaba = db.guardados.includes(postId)
  db.guardados = estaba ? db.guardados.filter((x) => x !== postId) : [...db.guardados, postId]
  if (!estaba) registrarEvento('guardado', postId, 'post')
  escribir(db)
  notificar()
  return !estaba
}

export const listarGuardados = () => leer().guardados

// ── Analítica ───────────────────────────────────────────────────────────────

/**
 * Registra un evento y actualiza el contador agregado del aviso.
 * La métrica estrella es `clic-contacto`: mide intención real, no curiosidad.
 */
export const registrarEvento = (
  kind: EventKind,
  targetId: string,
  targetType: 'post' | 'emprendimiento' = 'post',
) => {
  const db = leer()
  const at = new Date().toISOString()
  const post = targetType === 'post' ? db.posts.find((p) => p.id === targetId) : undefined
  const emp = targetType === 'emprendimiento' ? db.emprendimientos.find((e) => e.id === targetId) : undefined
  const stats = post?.stats ?? emp?.stats
  if (!stats) return

  if (kind === 'vista') stats.vistas++
  if (kind === 'clic-contacto') stats.clicsContacto++
  if (kind === 'guardado') stats.guardados++
  if (kind === 'compartido') stats.compartidos++

  db.eventos.push({ id: id('ev'), kind, targetId, targetType, postType: post?.type, at })
  escribir(db)
  notificar()
}

export const listarEventos = (): AnalyticsEvent[] => leer().eventos

// ── Reportes ────────────────────────────────────────────────────────────────

export const reportarPost = async (postId: string, motivo: string, detalle: string, reportadoPor: string) => {
  const db = leer()
  const reporte: Report = {
    id: id('rep'),
    postId,
    motivo,
    detalle,
    creadoEn: new Date().toISOString(),
    reportadoPor,
    resuelto: false,
  }
  db.reportes.unshift(reporte)
  escribir(db)
  notificar()
  return demora(reporte, 300)
}

export const listarReportes = () => leer().reportes

export const resolverReporte = async (reporteId: string) => {
  const db = leer()
  const r = db.reportes.find((x) => x.id === reporteId)
  if (r) r.resuelto = true
  escribir(db)
  notificar()
  return demora(r, 150)
}

// ── Emprendimientos ─────────────────────────────────────────────────────────

export const listarEmprendimientos = (soloAprobados = true): Emprendimiento[] => {
  barrerExpirados()
  const lista = leer().emprendimientos
  const visibles = soloAprobados ? lista.filter((e) => e.status === 'aprobado') : lista
  const peso = (e: Emprendimiento) => (e.plan === 'pro' ? 0 : e.plan === 'emprendedor' ? 1 : 2)
  return [...visibles].sort((a, b) => peso(a) - peso(b) || b.stats.vistas - a.stats.vistas)
}

export const obtenerEmprendimiento = (empId: string) =>
  leer().emprendimientos.find((e) => e.id === empId)

export type BorradorEmprendimiento = Omit<
  Emprendimiento,
  'id' | 'creadoEn' | 'stats' | 'status' | 'suscripcionHasta' | 'suscripcionStatus' | 'moderacion'
>

export const crearEmprendimiento = async (borrador: BorradorEmprendimiento): Promise<Emprendimiento> => {
  const db = leer()
  const nuevo: Emprendimiento = {
    ...borrador,
    id: id('e'),
    creadoEn: new Date().toISOString(),
    status: 'pendiente',
    suscripcionHasta: new Date(Date.now() + (borrador.plan === 'vitrina' ? 3650 : 30) * DIA).toISOString(),
    suscripcionStatus: borrador.plan === 'vitrina' ? 'activa' : 'pendiente-pago',
    stats: { vistas: 0, clicsContacto: 0, guardados: 0, compartidos: 0 },
  }
  db.emprendimientos.unshift(nuevo)
  escribir(db)
  notificar()
  return demora(nuevo, 400)
}

export const moderarEmprendimiento = async (
  empId: string,
  accion: 'aprobar' | 'rechazar',
  opciones: { revisadoPor: string; motivo?: string } = { revisadoPor: 'Moderación FEUCN' },
) => {
  const db = leer()
  const e = db.emprendimientos.find((x) => x.id === empId)
  if (!e) return demora(undefined)
  e.status = accion === 'aprobar' ? 'aprobado' : 'rechazado'
  e.moderacion = { revisadoPor: opciones.revisadoPor, revisadoEn: new Date().toISOString(), motivo: opciones.motivo }
  escribir(db)
  notificar()
  return demora(e, 200)
}

// ── Suscripciones ───────────────────────────────────────────────────────────

/**
 * Crea una *solicitud* de plan. La plataforma nunca cobra: la FEUCN confirma el
 * pago fuera de línea (tesorería) y recién ahí se activa la suscripción.
 */
export const solicitarPlan = async (datos: {
  emprendimientoId: string
  emprendimiento: string
  plan: PlanId
  solicitanteId: string
  solicitante: string
  correo: string
  meses: number
}): Promise<SolicitudPlan> => {
  const db = leer()
  const solicitud: SolicitudPlan = {
    ...datos,
    id: id('sol'),
    creadoEn: new Date().toISOString(),
    status: 'pendiente',
  }
  db.solicitudes.unshift(solicitud)
  const emp = db.emprendimientos.find((e) => e.id === datos.emprendimientoId)
  if (emp) emp.suscripcionStatus = 'pendiente-pago'
  escribir(db)
  notificar()
  return demora(solicitud, 400)
}

export const listarSolicitudes = () => leer().solicitudes

export const resolverSolicitud = async (solicitudId: string, accion: 'confirmar' | 'rechazar', nota?: string) => {
  const db = leer()
  const s = db.solicitudes.find((x) => x.id === solicitudId)
  if (!s) return demora(undefined)
  s.status = accion === 'confirmar' ? 'confirmada' : 'rechazada'
  s.nota = nota
  const emp = db.emprendimientos.find((e) => e.id === s.emprendimientoId)
  if (emp && accion === 'confirmar') {
    const base = Math.max(Date.now(), new Date(emp.suscripcionHasta).getTime())
    emp.plan = s.plan
    emp.suscripcionHasta = new Date(base + s.meses * 30 * DIA).toISOString()
    emp.suscripcionStatus = 'activa'
    if (emp.status === 'pendiente') emp.status = 'aprobado'
  }
  escribir(db)
  notificar()
  return demora(s, 250)
}

// ── Utilidades de demo ──────────────────────────────────────────────────────

export const reiniciarDemo = () => {
  cache = crearBaseDemo()
  escribir(cache)
  notificar()
}

export const exportarDatos = () => JSON.stringify(leer(), null, 2)

// ── Ferias de emprendimiento ────────────────────────────────────────────────

export const listarFerias = (): Feria[] =>
  [...leer().ferias].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))

export const obtenerFeria = (feriaId: string) => leer().ferias.find((f) => f.id === feriaId)

/** La feria que la comunidad ve en portada: la abierta, o la próxima cerrada. */
export const feriaVigente = (): Feria | undefined => {
  const ferias = listarFerias()
  return ferias.find((f) => f.estado === 'abierta') ?? ferias.find((f) => f.estado === 'cerrada')
}

export const listarPostulaciones = (feriaId?: string): PostulacionFeria[] => {
  const todas = leer().postulaciones
  const lista = feriaId ? todas.filter((p) => p.feriaId === feriaId) : todas
  return [...lista].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
}

export const cuposRestantes = (feria: Feria) =>
  Math.max(0, feria.cupos - listarPostulaciones(feria.id).length)

export type BorradorPostulacion = Omit<
  PostulacionFeria,
  'id' | 'creadoEn' | 'estado' | 'puesto' | 'pagoInscripcion' | 'entregaAlimento' | 'avisadoEn'
>

export type ResultadoPostulacion =
  | { ok: true; postulacion: PostulacionFeria; seCerro: boolean }
  | { ok: false; motivo: string }

/**
 * Registra una postulación. Al alcanzar el cupo definido, la convocatoria se
 * cierra sola: es la automatización que pidió la federación para no tener que
 * estar mirando el contador.
 */
export const postularFeria = async (borrador: BorradorPostulacion): Promise<ResultadoPostulacion> => {
  const db = leer()
  const feria = db.ferias.find((f) => f.id === borrador.feriaId)
  if (!feria) return demora({ ok: false, motivo: 'Esa feria ya no existe.' } as const)
  if (feria.estado !== 'abierta') {
    return demora({ ok: false, motivo: 'La convocatoria está cerrada.' } as const)
  }

  const yaPostulo = db.postulaciones.some(
    (p) => p.feriaId === feria.id && limpiarRut(p.rut) === limpiarRut(borrador.rut),
  )
  if (yaPostulo) {
    return demora({ ok: false, motivo: 'Ya hay una postulación registrada con ese RUT.' } as const)
  }
  if (db.postulaciones.filter((p) => p.feriaId === feria.id).length >= feria.cupos) {
    feria.estado = 'cerrada'
    feria.cerradaEn = new Date().toISOString()
    escribir(db)
    notificar()
    return demora({ ok: false, motivo: 'Se acaba de llenar el cupo.' } as const)
  }

  const postulacion: PostulacionFeria = {
    ...borrador,
    id: id('pf'),
    creadoEn: new Date().toISOString(),
    estado: 'recibida',
    pagoInscripcion: false,
    entregaAlimento: false,
  }
  db.postulaciones.push(postulacion)

  const total = db.postulaciones.filter((p) => p.feriaId === feria.id).length
  const seCerro = total >= feria.cupos
  if (seCerro) {
    feria.estado = 'cerrada'
    feria.cerradaEn = new Date().toISOString()
  }

  escribir(db)
  notificar()
  return demora({ ok: true, postulacion, seCerro } as const, 400)
}

export type BorradorFeria = Omit<Feria, 'id' | 'creadoEn' | 'cerradaEn'>

export const crearFeria = async (borrador: BorradorFeria): Promise<Feria> => {
  const db = leer()
  const nueva: Feria = { ...borrador, id: id('f'), creadoEn: new Date().toISOString() }
  db.ferias.unshift(nueva)
  escribir(db)
  notificar()
  return demora(nueva, 300)
}

export const actualizarFeria = async (feriaId: string, cambios: Partial<Feria>) => {
  const db = leer()
  const f = db.ferias.find((x) => x.id === feriaId)
  if (!f) return demora(undefined)
  Object.assign(f, cambios)
  if (cambios.estado === 'cerrada' && !f.cerradaEn) f.cerradaEn = new Date().toISOString()
  if (cambios.estado === 'abierta') {
    f.cerradaEn = undefined
    f.abiertaDesde = f.abiertaDesde ?? new Date().toISOString()
  }
  escribir(db)
  notificar()
  return demora(f, 200)
}

export const cambiarEstadoPostulacion = async (
  postulacionId: string,
  estado: PostulacionFeria['estado'],
) => {
  const db = leer()
  const p = db.postulaciones.find((x) => x.id === postulacionId)
  if (!p) return demora(undefined)
  p.estado = estado
  if (estado !== 'seleccionada') p.puesto = undefined
  escribir(db)
  notificar()
  return demora(p, 150)
}

export interface ResultadoSorteo {
  /** MAPAU que tomaron los primeros números. */
  mapau: number
  /** Los demás, repartidos al azar entre los números que quedaron. */
  sorteados: number
  /** Seleccionados que se quedaron sin mesa porque no alcanzaron. */
  sinPuesto: number
}

/**
 * Reparte las mesas entre los seleccionados.
 *
 * Los emprendimientos MAPAU van primero y toman los números más bajos, en el
 * orden en que postularon; recién después se sortean las mesas que sobran entre
 * el resto. Si la administración ya le puso un número a alguien a mano, ese
 * número se respeta y sale del bombo.
 */
export const sortearPuestos = async (feriaId: string): Promise<ResultadoSorteo> => {
  const db = leer()
  const feria = db.ferias.find((f) => f.id === feriaId)
  if (!feria) return demora({ mapau: 0, sorteados: 0, sinPuesto: 0 })

  // listarPostulaciones ordena por fecha de postulación: los MAPAU respetan ese orden.
  const seleccionados = listarPostulaciones(feriaId).filter((p) => p.estado === 'seleccionada')
  const mapau = seleccionados.filter((p) => p.esMapau)
  const resto = seleccionados.filter((p) => !p.esMapau)

  const tomados = new Set<number>(mapau.filter((p) => p.puesto).map((p) => p.puesto as number))

  // 1. MAPAU: los primeros números libres, de menor a mayor.
  let mapauAsignados = 0
  let sinPuesto = 0
  let siguiente = 1
  for (const p of mapau) {
    if (p.puesto) {
      mapauAsignados++
      continue
    }
    while (siguiente <= feria.puestos && tomados.has(siguiente)) siguiente++
    if (siguiente > feria.puestos) {
      p.puesto = undefined
      sinPuesto++
      continue
    }
    p.puesto = siguiente
    tomados.add(siguiente)
    mapauAsignados++
    siguiente++
  }

  // 2. El resto: sorteo entre las mesas que quedan.
  const libres: number[] = []
  for (let n = 1; n <= feria.puestos; n++) if (!tomados.has(n)) libres.push(n)

  // Fisher-Yates: cada orden posible tiene la misma probabilidad.
  for (let i = libres.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[libres[i], libres[j]] = [libres[j], libres[i]]
  }

  let sorteados = 0
  for (const p of resto) {
    const n = libres.pop()
    if (n === undefined) {
      p.puesto = undefined
      sinPuesto++
    } else {
      p.puesto = n
      sorteados++
    }
  }

  escribir(db)
  notificar()
  return demora({ mapau: mapauAsignados, sorteados, sinPuesto }, 400)
}

export const asignarPuesto = async (postulacionId: string, puesto: number | undefined) => {
  const db = leer()
  const p = db.postulaciones.find((x) => x.id === postulacionId)
  if (!p) return demora(undefined)
  p.puesto = puesto
  escribir(db)
  notificar()
  return demora(p, 120)
}

/** Deja registro de que a los seleccionados ya se les avisó. */
export const marcarAvisados = async (feriaId: string) => {
  const db = leer()
  const ahora = new Date().toISOString()
  let cuantos = 0
  for (const p of db.postulaciones) {
    if (p.feriaId === feriaId && p.estado === 'seleccionada' && !p.avisadoEn) {
      p.avisadoEn = ahora
      cuantos++
    }
  }
  escribir(db)
  notificar()
  return demora(cuantos, 200)
}

/** Control en terreno: aporte de inscripción y alimento no perecible. */
export const marcarControl = async (
  postulacionId: string,
  campo: 'pagoInscripcion' | 'entregaAlimento',
  valor: boolean,
) => {
  const db = leer()
  const p = db.postulaciones.find((x) => x.id === postulacionId)
  if (!p) return demora(undefined)
  p[campo] = valor
  escribir(db)
  notificar()
  return demora(p, 120)
}
