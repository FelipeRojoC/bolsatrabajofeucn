import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../lib/api'
import { normalizar } from '../lib/format'
import { TIPOS } from '../lib/constants'
import { Icono, type NombreIcono } from './Iconos'

interface Resultado {
  id: string
  titulo: string
  contexto: string
  icono: NombreIcono
  color?: string
  ir: string
}

const SECCIONES: Resultado[] = [
  { id: 's-1', titulo: 'Publicar un aviso', contexto: 'Trabajo, venta u objeto perdido', icono: 'mas', ir: '/publicar' },
  { id: 's-2', titulo: 'Mis avisos y estadísticas', contexto: 'Cómo va lo que publicaste', icono: 'grafico', ir: '/mis-avisos' },
  { id: 's-3', titulo: 'Directorio de emprendimientos', contexto: 'Negocios de estudiantes UCN', icono: 'tienda', ir: '/emprendimientos' },
  { id: 's-4', titulo: 'Planes para emprendimientos', contexto: 'Vitrina, Emprendedor y Pro', icono: 'tarjeta', ir: '/planes' },
  { id: 's-5', titulo: '¿Se perdió esto?', contexto: 'Foro de objetos perdidos', icono: 'perdido', ir: '/perdidos' },
  { id: 's-6', titulo: 'Sobre la FEUCN', contexto: 'Federación de Estudiantes UCN', icono: 'info', ir: '/feucn' },
  { id: 's-7', titulo: 'Estadísticas públicas', contexto: 'Cómo se usa la plataforma', icono: 'grafico', ir: '/estadisticas' },
]

export const BuscadorRapido = ({ alNavegar }: { alNavegar: () => void }) => {
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const navegar = useNavigate()

  const resultados = useMemo<Resultado[]>(() => {
    const t = normalizar(q).trim()
    if (!t) return SECCIONES

    const coincide = (texto: string) => normalizar(texto).includes(t)

    const avisos = api
      .filtrarPosts(api.listarTodos(), { status: ['aprobado'] })
      .filter((p) => coincide(`${p.titulo} ${p.categoria} ${p.ubicacion.zona}`))
      .slice(0, 6)
      .map<Resultado>((p) => ({
        id: p.id,
        titulo: p.titulo,
        contexto: `${TIPOS[p.type].label} · ${p.categoria}`,
        icono: p.type,
        color: TIPOS[p.type].color,
        ir: `/aviso/${p.id}`,
      }))

    const emps = api
      .listarEmprendimientos()
      .filter((e) => coincide(`${e.nombre} ${e.rubro} ${e.lema}`))
      .slice(0, 4)
      .map<Resultado>((e) => ({
        id: e.id,
        titulo: e.nombre,
        contexto: `Emprendimiento · ${e.rubro}`,
        icono: 'tienda',
        color: e.logo,
        ir: `/emprendimientos?abrir=${e.id}`,
      }))

    const secs = SECCIONES.filter((s) => coincide(`${s.titulo} ${s.contexto}`))

    return [...avisos, ...emps, ...secs].slice(0, 12)
  }, [q])

  const ir = (r: Resultado) => {
    navegar(r.ir)
    alNavegar()
  }

  return (
    <div className="columna" style={{ gap: 14 }}>
      <div className="buscador">
        <Icono nombre="buscar" tam={18} />
        <input
          className="entrada"
          data-autofoco
          placeholder="Calculadora, ayudantía de cálculo, tortas…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setCursor(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(resultados.length - 1, c + 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)) }
            if (e.key === 'Enter' && resultados[cursor]) ir(resultados[cursor])
          }}
          aria-label="Buscar"
          role="combobox"
          aria-expanded
          aria-controls="resultados-busqueda"
        />
      </div>

      <div id="resultados-busqueda" className="columna" style={{ gap: 2 }} role="listbox">
        {resultados.length === 0 && (
          <p className="chico tenue centro" style={{ padding: '22px 0' }}>
            Nada por ahora. Prueba con otra palabra o publica tú el aviso.
          </p>
        )}
        {resultados.map((r, i) => (
          <button
            key={r.id}
            className="menu-item"
            role="option"
            aria-selected={i === cursor}
            style={i === cursor ? { background: 'var(--plano-2)' } : undefined}
            onMouseEnter={() => setCursor(i)}
            onClick={() => ir(r)}
          >
            <Icono nombre={r.icono} tam={17} style={{ color: r.color ?? 'var(--tinta-3)' }} />
            <span className="crecer">
              <span className="chico fuerte recorte-2" style={{ display: 'block' }}>{r.titulo}</span>
              <span className="mini tenue">{r.contexto}</span>
            </span>
            <Icono nombre="chevron" tam={15} className="muy-tenue" />
          </button>
        ))}
      </div>
    </div>
  )
}
