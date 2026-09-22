/**
 * Gráficos hechos a mano en SVG. Sin librerías: cada marca sigue las mismas
 * reglas — barras finas con extremo redondeado de 4px, líneas de 2px,
 * marcadores con anillo del color de la superficie, grilla de un pelo, y
 * leyenda siempre que haya dos o más series.
 *
 * Todos los gráficos con color categórico ofrecen "ver tabla": dos de los tonos
 * de la paleta quedan bajo 3:1 contra la superficie clara, así que la tabla y
 * las etiquetas directas son el canal de respaldo obligatorio, no un extra.
 */
import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Icono } from './Iconos'
import { compacto, formatearNumero, porcentaje } from '../lib/format'

/* ── Utilidades ─────────────────────────────────────────────────────────── */

const useAncho = <T extends HTMLElement>() => {
  const ref = useRef<T>(null)
  const [ancho, setAncho] = useState(680)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(240, e.contentRect.width)))
    ro.observe(el)
    setAncho(Math.max(240, el.clientWidth))
    return () => ro.disconnect()
  }, [])
  return [ref, ancho] as const
}

/** Ticks redondos: 0 / 500 / 1.000 en vez de 0 / 437 / 874. */
const escalaBonita = (max: number, divisiones = 4) => {
  if (max <= 0) return { tope: divisiones, ticks: Array.from({ length: divisiones + 1 }, (_, i) => i) }
  const crudo = max / divisiones
  const mag = Math.pow(10, Math.floor(Math.log10(crudo)))
  const norm = crudo / mag
  const paso = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const tope = Math.ceil(max / paso) * paso
  const ticks: number[] = []
  for (let v = 0; v <= tope + 1e-9; v += paso) ticks.push(Math.round(v * 100) / 100)
  return { tope, ticks }
}

const rutaLinea = (puntos: { x: number; y: number }[]) =>
  puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

interface EnvolturaProps {
  titulo: string
  subtitulo?: string
  acciones?: ReactNode
  leyenda?: { etiqueta: string; color: string; tipo?: 'bloque' | 'linea' }[]
  tabla?: { columnas: string[]; filas: (string | number)[][] }
  children: ReactNode
}

/** Marco común: título, leyenda, acciones y el interruptor gráfico/tabla. */
export const Viz = ({ titulo, subtitulo, acciones, leyenda, tabla, children }: EnvolturaProps) => {
  const [verTabla, setVerTabla] = useState(false)
  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-cabecera">
        <figcaption>
          <div className="viz-titulo">{titulo}</div>
          {subtitulo && <div className="viz-sub">{subtitulo}</div>}
        </figcaption>
        <div className="viz-acciones">
          {acciones}
          {tabla && (
            <button
              className="btn btn-fantasma btn-chico"
              onClick={() => setVerTabla((v) => !v)}
              aria-pressed={verTabla}
            >
              <Icono nombre={verTabla ? 'grafico' : 'lista'} tam={15} />
              {verTabla ? 'Ver gráfico' : 'Ver tabla'}
            </button>
          )}
        </div>
      </div>

      {verTabla && tabla ? (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          <table className="viz-tabla">
            <thead>
              <tr>{tabla.columnas.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
            </thead>
            <tbody>
              {tabla.filas.map((f, i) => (
                <tr key={i}>{f.map((c, j) => (j === 0 ? <th key={j} scope="row" style={{ textAlign: 'left' }}>{c}</th> : <td key={j}>{c}</td>))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}

      {leyenda && leyenda.length > 1 && !verTabla && (
        <div className="leyenda">
          {leyenda.map((l) => (
            <span key={l.etiqueta} className="leyenda-item">
              <span className={`leyenda-llave${l.tipo === 'linea' ? ' linea' : ''}`} style={{ background: l.color }} />
              {l.etiqueta}
            </span>
          ))}
        </div>
      )}
    </figure>
  )
}

/* ── Chispa (sparkline) ─────────────────────────────────────────────────── */

export const Chispa = ({ datos, color = 'var(--serie-1)', alto = 30 }: { datos: number[]; color?: string; alto?: number }) => {
  const [ref, ancho] = useAncho<HTMLDivElement>()
  if (datos.length < 2) return <div ref={ref} style={{ height: alto }} />
  const max = Math.max(...datos, 1)
  const puntos = datos.map((v, i) => ({
    x: (i / (datos.length - 1)) * (ancho - 4) + 2,
    y: alto - 3 - (v / max) * (alto - 8),
  }))
  const ultimo = puntos[puntos.length - 1]
  return (
    <div ref={ref} className="cifra-chispa">
      <svg width={ancho} height={alto} aria-hidden="true">
        <path d={`${rutaLinea(puntos)} L${ultimo.x} ${alto} L${puntos[0].x} ${alto} Z`} fill={color} opacity={0.1} />
        <path d={rutaLinea(puntos)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={ultimo.x} cy={ultimo.y} r={4} fill={color} stroke="var(--superficie)" strokeWidth={2} />
      </svg>
    </div>
  )
}

/* ── Tarjeta de cifra ───────────────────────────────────────────────────── */

interface CifraProps {
  etiqueta: string
  valor: string
  delta?: number | null
  /** true cuando subir es bueno (vistas); false cuando subir es malo (cola). */
  subirEsBueno?: boolean
  periodo?: string
  chispa?: number[]
  colorChispa?: string
  pie?: string
  heroe?: boolean
}

export const Cifra = ({ etiqueta, valor, delta, subirEsBueno = true, periodo, chispa, colorChispa, pie, heroe }: CifraProps) => {
  const dir = delta == null ? 'neutro' : delta > 0.001 ? (subirEsBueno ? 'sube' : 'baja') : delta < -0.001 ? (subirEsBueno ? 'baja' : 'sube') : 'neutro'
  return (
    <div className="cifra">
      <span className="cifra-etiqueta">{etiqueta}</span>
      <span className={heroe ? 'cifra-heroe' : 'cifra-valor'}>{valor}</span>
      {delta != null && (
        <span className={`cifra-delta ${dir}`}>
          <Icono nombre={delta >= 0 ? 'arribaTend' : 'abajoTend'} tam={14} />
          {delta >= 0 ? '+' : '−'}
          {Math.abs(delta * 100).toFixed(0)}%{periodo ? ` ${periodo}` : ''}
        </span>
      )}
      {pie && <span className="cifra-pie">{pie}</span>}
      {chispa && chispa.length > 1 && <Chispa datos={chispa} color={colorChispa} />}
    </div>
  )
}

/* ── Líneas con cruz y globo ────────────────────────────────────────────── */

export interface SerieLinea {
  nombre: string
  color: string
  valores: number[]
}

interface LineasProps {
  titulo: string
  subtitulo?: string
  etiquetas: string[]
  series: SerieLinea[]
  alto?: number
  formato?: (v: number) => string
  acciones?: ReactNode
}

export const GraficoLineas = ({ titulo, subtitulo, etiquetas, series, alto = 230, formato = formatearNumero, acciones }: LineasProps) => {
  const [ref, ancho] = useAncho<HTMLDivElement>()
  const [activo, setActivo] = useState<number | null>(null)

  const m = { top: 14, right: 16, bottom: 26, left: 44 }
  const w = Math.max(200, ancho - m.left - m.right)
  const h = alto - m.top - m.bottom
  const max = Math.max(1, ...series.flatMap((s) => s.valores))
  const { tope, ticks } = escalaBonita(max)
  const n = etiquetas.length
  const px = (i: number) => (n <= 1 ? w / 2 : (i / (n - 1)) * w)
  const py = (v: number) => h - (v / tope) * h

  // Máximo 6 etiquetas en el eje X para que nunca se pisen.
  const saltoX = Math.max(1, Math.ceil(n / 6))

  const alMover = (e: React.MouseEvent<SVGRectElement>) => {
    const caja = e.currentTarget.getBoundingClientRect()
    const rel = e.clientX - caja.left
    setActivo(Math.max(0, Math.min(n - 1, Math.round((rel / caja.width) * (n - 1)))))
  }

  return (
    <Viz
      titulo={titulo}
      subtitulo={subtitulo}
      acciones={acciones}
      leyenda={series.map((s) => ({ etiqueta: s.nombre, color: s.color, tipo: 'linea' as const }))}
      tabla={{
        columnas: ['Día', ...series.map((s) => s.nombre)],
        filas: etiquetas.map((e, i) => [e, ...series.map((s) => formato(s.valores[i] ?? 0))]),
      }}
    >
      <div className="viz-pista" ref={ref}>
        <svg width={ancho} height={alto} role="img" aria-label={`${titulo}. ${series.map((s) => `${s.nombre}: máximo ${formato(Math.max(...s.valores))}`).join('. ')}`}>
          <g transform={`translate(${m.left},${m.top})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="viz-grilla" x1={0} x2={w} y1={py(t)} y2={py(t)} />
                <text className="viz-tick" x={-9} y={py(t) + 3.5} textAnchor="end">{compacto(t)}</text>
              </g>
            ))}
            <line className="viz-eje" x1={0} x2={w} y1={h} y2={h} />

            {etiquetas.map((e, i) => {
              const esUltima = i === n - 1
              // Sin esta guarda, la última etiqueta se pisa con la anterior.
              const visible = esUltima || (i % saltoX === 0 && n - 1 - i >= saltoX)
              if (!visible) return null
              return (
                <text key={e} className="viz-tick" x={px(i)} y={h + 16} textAnchor={i === 0 ? 'start' : esUltima ? 'end' : 'middle'}>
                  {e}
                </text>
              )
            })}

            {activo != null && <line className="viz-cruz" x1={px(activo)} x2={px(activo)} y1={0} y2={h} />}

            {series.map((s) => {
              const pts = s.valores.map((v, i) => ({ x: px(i), y: py(v) }))
              return (
                <g key={s.nombre}>
                  <path d={`${rutaLinea(pts)} L${pts[pts.length - 1].x} ${h} L${pts[0].x} ${h} Z`} fill={s.color} opacity={0.1} />
                  <path d={rutaLinea(pts)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4.5} fill={s.color} stroke="var(--superficie)" strokeWidth={2} />
                  {activo != null && (
                    <circle cx={px(activo)} cy={py(s.valores[activo] ?? 0)} r={4.5} fill={s.color} stroke="var(--superficie)" strokeWidth={2} />
                  )}
                </g>
              )
            })}

            <rect
              x={0}
              y={0}
              width={w}
              height={h}
              fill="transparent"
              onMouseMove={alMover}
              onMouseLeave={() => setActivo(null)}
            />
          </g>
        </svg>

        {activo != null && (
          <div
            className="viz-globo"
            style={{
              left: Math.min(Math.max(m.left + px(activo), 80), ancho - 80),
              top: m.top + 6,
            }}
          >
            <div style={{ marginBottom: 4, opacity: 0.75 }}>{etiquetas[activo]}</div>
            {series.map((s) => (
              <div key={s.nombre} className="viz-globo-fila">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="viz-globo-llave" style={{ background: s.color }} />
                  {s.nombre}
                </span>
                <b>{formato(s.valores[activo] ?? 0)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </Viz>
  )
}

/* ── Columnas apiladas ──────────────────────────────────────────────────── */

interface ApiladoProps {
  titulo: string
  subtitulo?: string
  etiquetas: string[]
  series: SerieLinea[]
  alto?: number
}

export const GraficoApilado = ({ titulo, subtitulo, etiquetas, series, alto = 230 }: ApiladoProps) => {
  const [ref, ancho] = useAncho<HTMLDivElement>()
  const [activo, setActivo] = useState<number | null>(null)

  const m = { top: 14, right: 14, bottom: 26, left: 44 }
  const w = Math.max(200, ancho - m.left - m.right)
  const h = alto - m.top - m.bottom
  const n = etiquetas.length
  const totales = etiquetas.map((_, i) => series.reduce((a, s) => a + (s.valores[i] ?? 0), 0))
  const { tope, ticks } = escalaBonita(Math.max(1, ...totales))
  const banda = w / Math.max(1, n)
  const grosor = Math.min(24, banda * 0.62)
  const py = (v: number) => h - (v / tope) * h
  const saltoX = Math.max(1, Math.ceil(n / 6))

  return (
    <Viz
      titulo={titulo}
      subtitulo={subtitulo}
      leyenda={series.map((s) => ({ etiqueta: s.nombre, color: s.color }))}
      tabla={{
        columnas: ['Día', ...series.map((s) => s.nombre), 'Total'],
        filas: etiquetas.map((e, i) => [e, ...series.map((s) => formatearNumero(s.valores[i] ?? 0)), formatearNumero(totales[i])]),
      }}
    >
      <div className="viz-pista" ref={ref}>
        <svg width={ancho} height={alto} role="img" aria-label={`${titulo}, columnas apiladas por tipo de aviso`}>
          <g transform={`translate(${m.left},${m.top})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="viz-grilla" x1={0} x2={w} y1={py(t)} y2={py(t)} />
                <text className="viz-tick" x={-9} y={py(t) + 3.5} textAnchor="end">{compacto(t)}</text>
              </g>
            ))}
            <line className="viz-eje" x1={0} x2={w} y1={h} y2={h} />

            {etiquetas.map((e, i) => {
              const cx = i * banda + banda / 2
              let acumulado = 0
              return (
                <g key={e} onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)}>
                  <rect x={i * banda} y={0} width={banda} height={h} fill="transparent" />
                  {series.map((s, si) => {
                    const v = s.valores[i] ?? 0
                    if (v <= 0) return null
                    const yTope = py(acumulado + v)
                    const yBase = py(acumulado)
                    acumulado += v
                    // 2px de superficie separan cada segmento: el aire hace de borde.
                    const altura = Math.max(1, yBase - yTope - (si > 0 ? 2 : 0))
                    const esCima = acumulado >= totales[i] - 0.001
                    return (
                      <rect
                        key={s.nombre}
                        x={cx - grosor / 2}
                        y={yTope}
                        width={grosor}
                        height={altura}
                        rx={esCima ? 4 : 0}
                        fill={s.color}
                        opacity={activo == null || activo === i ? 1 : 0.35}
                      />
                    )
                  })}
                  {i % saltoX === 0 && (
                    <text className="viz-tick" x={cx} y={h + 16} textAnchor="middle">{e}</text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {activo != null && totales[activo] > 0 && (
          <div
            className="viz-globo"
            style={{ left: Math.min(Math.max(m.left + activo * banda + banda / 2, 84), ancho - 84), top: m.top + py(totales[activo]) }}
          >
            <div style={{ marginBottom: 4, opacity: 0.75 }}>{etiquetas[activo]}</div>
            {series.map((s) => (
              <div key={s.nombre} className="viz-globo-fila">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="viz-globo-llave" style={{ background: s.color }} />
                  {s.nombre}
                </span>
                <b>{formatearNumero(s.valores[activo] ?? 0)}</b>
              </div>
            ))}
            <div className="viz-globo-fila" style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <span>Total</span>
              <b>{formatearNumero(totales[activo])}</b>
            </div>
          </div>
        )}
      </div>
    </Viz>
  )
}

/* ── Barras horizontales ────────────────────────────────────────────────── */

interface BarrasProps {
  titulo: string
  subtitulo?: string
  datos: { clave: string; valor: number; secundario?: number }[]
  color?: string
  etiquetaValor?: string
  etiquetaSecundario?: string
  formato?: (v: number) => string
}

export const GraficoBarras = ({
  titulo,
  subtitulo,
  datos,
  color = 'var(--serie-1)',
  etiquetaValor = 'Vistas',
  etiquetaSecundario,
  formato = formatearNumero,
}: BarrasProps) => {
  const [ref, ancho] = useAncho<HTMLDivElement>()
  const [activo, setActivo] = useState<number | null>(null)
  const anchoEtiqueta = Math.min(168, Math.max(96, ancho * 0.3))
  const max = Math.max(1, ...datos.map((d) => d.valor))
  const filaAlto = 30
  const alto = datos.length * filaAlto + 8
  const w = Math.max(60, ancho - anchoEtiqueta - 58)
  // ~6.1 px por carácter a 11px: el recorte se calcula con el espacio real.
  const maxCaracteres = Math.max(8, Math.floor((anchoEtiqueta - 10) / 6.1))

  return (
    <Viz
      titulo={titulo}
      subtitulo={subtitulo}
      tabla={{
        columnas: ['Categoría', etiquetaValor, ...(etiquetaSecundario ? [etiquetaSecundario] : [])],
        filas: datos.map((d) => [d.clave, formato(d.valor), ...(etiquetaSecundario ? [formato(d.secundario ?? 0)] : [])]),
      }}
    >
      <div className="viz-pista" ref={ref}>
        <svg width={ancho} height={alto} role="img" aria-label={`${titulo}. ${datos.map((d) => `${d.clave}: ${formato(d.valor)}`).join('. ')}`}>
          {datos.map((d, i) => {
            const y = i * filaAlto + 4
            const largo = (d.valor / max) * w
            const grosor = Math.min(18, filaAlto - 12)
            return (
              <g key={d.clave} onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)}>
                <rect x={0} y={y} width={ancho} height={filaAlto} fill="transparent" />
                <text className="viz-etiqueta" x={0} y={y + filaAlto / 2 + 4}>
                  {d.clave.length > maxCaracteres ? `${d.clave.slice(0, maxCaracteres - 1)}…` : d.clave}
                </text>
                <rect
                  x={anchoEtiqueta}
                  y={y + (filaAlto - grosor) / 2}
                  width={Math.max(2, largo)}
                  height={grosor}
                  rx={4}
                  fill={color}
                  opacity={activo == null || activo === i ? 1 : 0.4}
                />
                {/* Etiqueta directa al final de la barra: canal de respaldo del color. */}
                <text className="viz-valor" x={anchoEtiqueta + Math.max(2, largo) + 8} y={y + filaAlto / 2 + 4}>
                  {formato(d.valor)}
                </text>
              </g>
            )
          })}
        </svg>

        {activo != null && etiquetaSecundario && (
          <div className="viz-globo" style={{ left: Math.min(ancho - 90, anchoEtiqueta + 70), top: activo * filaAlto + 6 }}>
            <div style={{ marginBottom: 3, opacity: 0.75 }}>{datos[activo].clave}</div>
            <div className="viz-globo-fila"><span>{etiquetaValor}</span><b>{formato(datos[activo].valor)}</b></div>
            <div className="viz-globo-fila"><span>{etiquetaSecundario}</span><b>{formato(datos[activo].secundario ?? 0)}</b></div>
            <div className="viz-globo-fila"><span>Tasa</span><b>{porcentaje(datos[activo].secundario ?? 0, datos[activo].valor)}</b></div>
          </div>
        )}
      </div>
    </Viz>
  )
}

/* ── Mapa de calor ──────────────────────────────────────────────────────── */

const RAMPA = ['var(--seq-100)', 'var(--seq-200)', 'var(--seq-300)', 'var(--seq-400)', 'var(--seq-500)', 'var(--seq-600)']

export const MapaCalor = ({
  titulo,
  subtitulo,
  filas,
  columnas,
  grilla,
  max,
}: {
  titulo: string
  subtitulo?: string
  filas: string[]
  columnas: string[]
  grilla: number[][]
  max: number
}) => {
  // Escala de raíz cuadrada: con una escala lineal, el peak de un solo día
  // deja todas las demás celdas en el primer paso y el mapa se ve vacío.
  const paso = (v: number) => {
    if (v === 0) return 'var(--plano-2)'
    const t = Math.sqrt(v / Math.max(1, max))
    return RAMPA[Math.min(RAMPA.length - 1, Math.floor(t * RAMPA.length))]
  }
  return (
    <Viz
      titulo={titulo}
      subtitulo={subtitulo}
      tabla={{
        columnas: ['Día', ...columnas],
        filas: filas.map((f, i) => [f, ...grilla[i].map((v) => formatearNumero(v))]),
      }}
      acciones={
        <div className="calor-escala" aria-hidden="true">
          <span>menos</span>
          <span className="calor-escala-barra">
            {RAMPA.map((c) => <span key={c} style={{ background: c }} />)}
          </span>
          <span>más</span>
        </div>
      }
    >
      <div className="calor-grilla">
        <span />
        {columnas.map((c) => <span key={c} className="calor-col-lbl">{c}</span>)}
        {filas.map((f, i) => (
          <Fragment key={f}>
            <span className="calor-fila-lbl">{f}</span>
            {grilla[i].map((v, j) => (
              <div
                key={`${f}-${j}`}
                className="calor-celda"
                style={{ background: paso(v) }}
                title={`${f} ${columnas[j]} h · ${formatearNumero(v)} vistas`}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </Viz>
  )
}

/* ── Embudo ─────────────────────────────────────────────────────────────── */

export const Embudo = ({
  titulo,
  subtitulo,
  pasos,
}: {
  titulo: string
  subtitulo?: string
  pasos: { etiqueta: string; valor: number; color: string }[]
}) => {
  const max = Math.max(1, ...pasos.map((p) => p.valor))
  return (
    <Viz
      titulo={titulo}
      subtitulo={subtitulo}
      tabla={{
        columnas: ['Paso', 'Cantidad', 'Del total'],
        filas: pasos.map((p) => [p.etiqueta, formatearNumero(p.valor), porcentaje(p.valor, max)]),
      }}
    >
      <div className="embudo">
        {pasos.map((p, i) => (
          <div className="embudo-paso" key={p.etiqueta}>
            <span className="embudo-lbl">{p.etiqueta}</span>
            <span className="embudo-val">
              {formatearNumero(p.valor)}
              {i > 0 && <span className="muy-tenue"> · {porcentaje(p.valor, pasos[i - 1].valor)} del paso anterior</span>}
            </span>
            <div className="embudo-barra">
              <span style={{ width: `${(p.valor / max) * 100}%`, background: p.color }} />
            </div>
          </div>
        ))}
      </div>
    </Viz>
  )
}

/* ── Medidor ────────────────────────────────────────────────────────────── */

export const Medidor = ({ valor, etiqueta, maximo = 100 }: { valor: number; etiqueta?: string; maximo?: number }) => {
  const pct = Math.min(100, (valor / maximo) * 100)
  const color = valor >= 60 ? 'var(--critico)' : valor >= 30 ? 'var(--aviso)' : 'var(--ok)'
  const nivel = valor >= 60 ? 'Alto' : valor >= 30 ? 'Medio' : 'Bajo'
  return (
    <div className="medidor">
      <div className="medidor-lbl">
        <span>{etiqueta ?? 'Riesgo automático'}</span>
        <span style={{ color }}>{nivel} · {valor}</span>
      </div>
      <div className="medidor-pista">
        <div className="medidor-relleno" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
