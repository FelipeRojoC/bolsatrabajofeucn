import type { AnalyticsEvent, EventKind, Post, PostType } from './types'

const DIA = 86_400_000

const claveDia = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface PuntoSerie {
  clave: string
  etiqueta: string
  fecha: number
  valor: number
}

/** Serie diaria continua (incluye días en cero) para los últimos `dias`. */
export const serieDiaria = (
  eventos: AnalyticsEvent[],
  kinds: EventKind[],
  dias = 30,
  filtro?: (e: AnalyticsEvent) => boolean,
): PuntoSerie[] => {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const inicio = hoy.getTime() - (dias - 1) * DIA

  const cubos = new Map<string, number>()
  for (let i = 0; i < dias; i++) cubos.set(claveDia(inicio + i * DIA), 0)

  for (const ev of eventos) {
    if (!kinds.includes(ev.kind)) continue
    if (filtro && !filtro(ev)) continue
    const t = new Date(ev.at).getTime()
    if (t < inicio) continue
    const k = claveDia(t)
    if (cubos.has(k)) cubos.set(k, (cubos.get(k) ?? 0) + 1)
  }

  return [...cubos.entries()].map(([clave, valor]) => {
    const fecha = new Date(`${clave}T00:00:00`).getTime()
    return {
      clave,
      valor,
      fecha,
      etiqueta: new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
    }
  })
}

export interface SerieApilada {
  clave: string
  etiqueta: string
  fecha: number
  valores: Record<PostType, number>
  total: number
}

export const serieDiariaPorTipo = (
  eventos: AnalyticsEvent[],
  kinds: EventKind[],
  dias = 30,
): SerieApilada[] => {
  const base = serieDiaria(eventos, kinds, dias)
  const indice = new Map(base.map((p) => [p.clave, { trabajo: 0, venta: 0, perdido: 0 } as Record<PostType, number>]))

  for (const ev of eventos) {
    if (!kinds.includes(ev.kind) || !ev.postType) continue
    const k = claveDia(new Date(ev.at).getTime())
    const fila = indice.get(k)
    if (fila) fila[ev.postType] += 1
  }

  return base.map((p) => {
    const valores = indice.get(p.clave) ?? { trabajo: 0, venta: 0, perdido: 0 }
    return { ...p, valores, total: valores.trabajo + valores.venta + valores.perdido }
  })
}

export interface Categoria {
  clave: string
  valor: number
  secundario?: number
}

export const agruparPorCategoria = (posts: Post[], limite = 8): Categoria[] => {
  const mapa = new Map<string, { valor: number; secundario: number }>()
  for (const p of posts) {
    const actual = mapa.get(p.categoria) ?? { valor: 0, secundario: 0 }
    actual.valor += p.stats.vistas
    actual.secundario += p.stats.clicsContacto
    mapa.set(p.categoria, actual)
  }
  return [...mapa.entries()]
    .map(([clave, v]) => ({ clave, ...v }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite)
}

/** "Antofagasta — Casa Central" no cabe en el eje: se usa el nombre corto. */
const nombreCorto = (campus: string) => campus.split('—').pop()?.trim() ?? campus

export const agruparPorCampus = (posts: Post[]): Categoria[] => {
  const mapa = new Map<string, number>()
  for (const p of posts) {
    const clave = nombreCorto(p.ubicacion.campus)
    mapa.set(clave, (mapa.get(clave) ?? 0) + 1)
  }
  return [...mapa.entries()].map(([clave, valor]) => ({ clave, valor })).sort((a, b) => b.valor - a.valor)
}

/**
 * Mapa de calor día × franja horaria: responde "¿a qué hora conviene publicar?".
 * Devuelve 7 filas (dom→sáb) × 6 franjas de 4 horas.
 */
export const FRANJAS = ['00–04', '04–08', '08–12', '12–16', '16–20', '20–24']
export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export const mapaDeCalor = (eventos: AnalyticsEvent[], kinds: EventKind[], dias = 30) => {
  const corte = Date.now() - dias * DIA
  const grilla: number[][] = Array.from({ length: 7 }, () => Array(FRANJAS.length).fill(0))
  let max = 0
  for (const ev of eventos) {
    if (!kinds.includes(ev.kind)) continue
    const t = new Date(ev.at)
    if (t.getTime() < corte) continue
    const fila = t.getDay()
    const col = Math.floor(t.getHours() / 4)
    grilla[fila][col] += 1
    if (grilla[fila][col] > max) max = grilla[fila][col]
  }
  return { grilla, max }
}

export interface ResumenKPI {
  avisosActivos: number
  vistas7d: number
  vistasPrevias7d: number
  clics7d: number
  clicsPrevios7d: number
  tasaContacto: number
  tasaContactoPrevia: number
  enCola: number
  tiempoMedianoRevisionMin: number
  resueltosForo: number
  totalForo: number
}

const contar = (eventos: AnalyticsEvent[], kinds: EventKind[], desde: number, hasta: number) =>
  eventos.filter((e) => {
    if (!kinds.includes(e.kind)) return false
    const t = new Date(e.at).getTime()
    return t >= desde && t < hasta
  }).length

export const calcularKPIs = (posts: Post[], eventos: AnalyticsEvent[]): ResumenKPI => {
  const ahora = Date.now()
  const vistas7d = contar(eventos, ['vista'], ahora - 7 * DIA, ahora)
  const vistasPrevias7d = contar(eventos, ['vista'], ahora - 14 * DIA, ahora - 7 * DIA)
  const clics7d = contar(eventos, ['clic-contacto'], ahora - 7 * DIA, ahora)
  const clicsPrevios7d = contar(eventos, ['clic-contacto'], ahora - 14 * DIA, ahora - 7 * DIA)

  const revisados = posts.filter((p) => p.moderacion && p.publicadoEn)
  const tiempos = revisados
    .map((p) => (new Date(p.moderacion!.revisadoEn).getTime() - new Date(p.creadoEn).getTime()) / 60_000)
    .filter((m) => m >= 0)
    .sort((a, b) => a - b)
  const mediana = tiempos.length ? tiempos[Math.floor(tiempos.length / 2)] : 0

  const foro = posts.filter((p) => p.type === 'perdido')

  return {
    avisosActivos: posts.filter((p) => p.status === 'aprobado').length,
    vistas7d,
    vistasPrevias7d,
    clics7d,
    clicsPrevios7d,
    tasaContacto: vistas7d ? clics7d / vistas7d : 0,
    tasaContactoPrevia: vistasPrevias7d ? clicsPrevios7d / vistasPrevias7d : 0,
    enCola: posts.filter((p) => p.status === 'pendiente').length,
    tiempoMedianoRevisionMin: Math.round(mediana),
    resueltosForo: foro.filter((p) => p.resuelto).length,
    totalForo: foro.length,
  }
}

/** Variación relativa entre dos períodos, en puntos porcentuales de cambio. */
export const variacion = (actual: number, previo: number): number | null => {
  if (!previo) return null
  return (actual - previo) / previo
}

export interface FilaRanking {
  post: Post
  vistas: number
  clics: number
  tasa: number
}

export const ranking = (posts: Post[], limite = 6): FilaRanking[] =>
  posts
    .filter((p) => p.stats.vistas > 0)
    .map((p) => ({
      post: p,
      vistas: p.stats.vistas,
      clics: p.stats.clicsContacto,
      tasa: p.stats.vistas ? p.stats.clicsContacto / p.stats.vistas : 0,
    }))
    .sort((a, b) => b.clics - a.clics)
    .slice(0, limite)

/**
 * Percentil de un aviso dentro de su propio tipo, por tasa de contacto.
 * Es lo que se le muestra al autor: "tu aviso convierte mejor que el 78%".
 */
export const percentilTasa = (post: Post, posts: Post[]): number | null => {
  const pares = posts.filter((p) => p.type === post.type && p.stats.vistas >= 20 && p.id !== post.id)
  if (pares.length < 3 || post.stats.vistas < 20) return null
  const tasa = post.stats.clicsContacto / post.stats.vistas
  const peores = pares.filter((p) => p.stats.clicsContacto / p.stats.vistas < tasa).length
  return peores / pares.length
}
