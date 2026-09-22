const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const NUM = new Intl.NumberFormat('es-CL')

export const formatearPrecio = (valor?: number, nota?: string) => {
  if (nota && (valor === undefined || valor === 0)) return nota
  if (valor === undefined) return 'A convenir'
  if (valor === 0) return 'Gratis'
  return CLP.format(valor)
}

export const formatearNumero = (valor: number) => NUM.format(valor)

/** Compacta números grandes para tarjetas de estadística: 1.284 → 1,3K */
export const compacto = (valor: number) => {
  if (valor < 1000) return NUM.format(valor)
  if (valor < 1_000_000) return `${(valor / 1000).toFixed(valor < 10_000 ? 1 : 0).replace('.', ',')}K`
  return `${(valor / 1_000_000).toFixed(1).replace('.', ',')}M`
}

export const porcentaje = (parte: number, total: number, decimales = 1) => {
  if (!total) return '0%'
  return `${((parte / total) * 100).toFixed(decimales).replace('.', ',')}%`
}

const DIA_MS = 86_400_000

export interface Restante {
  ms: number
  dias: number
  horas: number
  minutos: number
  expirado: boolean
  /** 0 = recién publicado, 1 = expirado. Alimenta el anillo de vigencia. */
  progreso: number
  urgente: boolean
  etiqueta: string
}

export const tiempoRestante = (expiraEn: string, diasVigencia: number, ahora = Date.now()): Restante => {
  const fin = new Date(expiraEn).getTime()
  const total = diasVigencia * DIA_MS
  const ms = fin - ahora
  const expirado = ms <= 0
  const restante = Math.max(0, ms)
  const dias = Math.floor(restante / DIA_MS)
  const horas = Math.floor((restante % DIA_MS) / 3_600_000)
  const minutos = Math.floor((restante % 3_600_000) / 60_000)
  const progreso = Math.min(1, Math.max(0, 1 - restante / total))

  let etiqueta: string
  if (expirado) etiqueta = 'Expirado'
  else if (dias >= 1) etiqueta = `${dias} ${dias === 1 ? 'día' : 'días'} ${horas} h`
  else if (horas >= 1) etiqueta = `${horas} h ${minutos} min`
  else etiqueta = `${minutos} min`

  return { ms: restante, dias, horas, minutos, expirado, progreso, urgente: !expirado && restante < DIA_MS, etiqueta }
}

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })

export const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** "hace 3 h", "hace 2 días" — tono conversacional para el feed. */
export const hace = (iso: string, ahora = Date.now()) => {
  const diff = ahora - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 30) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
  const meses = Math.floor(dias / 30)
  return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`
}

export const iniciales = (nombre: string) =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

/** Normaliza para buscar sin tildes ni mayúsculas. */
export const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const soloDigitos = (texto: string) => texto.replace(/\D/g, '')

/** +56 9 1234 5678 → link de WhatsApp */
export const linkWhatsApp = (numero: string, mensaje: string) => {
  const limpio = soloDigitos(numero)
  const conPais = limpio.startsWith('56') ? limpio : `56${limpio.replace(/^0+/, '')}`
  return `https://wa.me/${conPais}?text=${encodeURIComponent(mensaje)}`
}

export const linkInstagram = (handle: string) =>
  `https://instagram.com/${handle.replace(/^@/, '').trim()}`

export const handleInstagram = (handle: string) => `@${handle.replace(/^@/, '').trim()}`
