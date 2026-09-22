import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api'
import { CATEGORIAS, LUGARES, TIPOS } from '../lib/constants'
import { formatearNumero } from '../lib/format'
import type { Post, PostType, TipoLugar } from '../lib/types'
import { TarjetaAviso } from '../components/TarjetaAviso'
import { DetalleAviso } from '../components/DetalleAviso'
import { Icono } from '../components/Iconos'
import { Vacio } from '../components/UI'
import { Mapa } from '../components/Mapa'
import { useApp } from '../state/contexto'
import { useTic } from '../components/useTic'

type Orden = NonNullable<api.FiltrosPost['orden']>

export const Avisos = () => {
  const { revision } = useApp()
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navegar = useNavigate()
  useTic()

  const tipoInicial = params.get('tipo') as PostType | null
  const [tipos, setTipos] = useState<PostType[]>(tipoInicial ? [tipoInicial] : [])
  const [busqueda, setBusqueda] = useState(params.get('q') ?? '')
  const [lugar, setLugar] = useState<TipoLugar | ''>('')
  const [categoria, setCategoria] = useState<string>('')
  const [orden, setOrden] = useState<Orden>('recientes')
  const [soloGratis, setSoloGratis] = useState(false)
  const [vista, setVista] = useState<'cuadricula' | 'lista'>('cuadricula')
  const [verMapa, setVerMapa] = useState(false)
  const [abierto, setAbierto] = useState<Post | null>(null)

  // Deep link: /aviso/:id abre el detalle directamente.
  useEffect(() => {
    if (!id) return
    const p = api.obtenerPost(id)
    if (p) setAbierto(p)
  }, [id, revision])

  const resultados = useMemo(() => {
    void revision
    return api.filtrarPosts(api.listarTodos(), {
      tipos: tipos.length ? tipos : ['trabajo', 'venta'],
      busqueda,
      lugares: lugar ? [lugar] : undefined,
      categorias: categoria ? [categoria] : undefined,
      soloGratis,
      orden,
      status: ['aprobado'],
    })
  }, [tipos, busqueda, lugar, categoria, soloGratis, orden, revision])

  // Mantiene actualizado el aviso abierto cuando cambian sus contadores.
  const postAbierto = abierto ? api.obtenerPost(abierto.id) ?? abierto : null

  const categoriasDisponibles = useMemo(() => {
    const base = tipos.length ? tipos : (['trabajo', 'venta'] as PostType[])
    return [...new Set(base.flatMap((t) => CATEGORIAS[t]))]
  }, [tipos])

  const alternarTipo = (t: PostType) => {
    setCategoria('')
    setTipos((actual) => (actual.includes(t) ? actual.filter((x) => x !== t) : [...actual, t]))
  }

  const limpiar = () => {
    setTipos([])
    setBusqueda('')
    setLugar('')
    setCategoria('')
    setSoloGratis(false)
    setOrden('recientes')
    setParams({})
  }

  const hayFiltros = Boolean(tipos.length || busqueda || lugar || categoria || soloGratis || orden !== 'recientes')

  const cerrarDetalle = () => {
    setAbierto(null)
    if (id) navegar('/avisos', { replace: true })
  }

  return (
    <>
      <div className="contenedor contenedor-ancho" style={{ paddingTop: 28 }}>
        <div className="seccion-titulo">
          <div>
            <h1>Avisos de la comunidad</h1>
            <p>
              Trabajos, servicios y cosas de segunda mano entre estudiantes UCN. Cada aviso dura 5 días y después se
              despublica solo.
            </p>
          </div>
          <button className="btn btn-primario" onClick={() => navegar('/publicar')}>
            <Icono nombre="mas" tam={17} /> Publicar aviso
          </button>
        </div>

        <div className="buscador buscador-grande" style={{ marginBottom: 16 }}>
          <Icono nombre="buscar" tam={19} />
          <input
            className="entrada"
            placeholder="¿Qué necesitas? Calculadora, ayudantía, bicicleta…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar avisos"
          />
          {busqueda && (
            <button className="btn btn-fantasma btn-icono btn-chico limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
              <Icono nombre="cerrar" tam={15} />
            </button>
          )}
        </div>
      </div>

      <div className="barra-filtros">
        <div className="contenedor contenedor-ancho">
          <div className="filtros-fila">
            {(['trabajo', 'venta'] as PostType[]).map((t) => (
              <button key={t} className="chip" aria-pressed={tipos.includes(t)} onClick={() => alternarTipo(t)}>
                <Icono nombre={t} tam={14} />
                {TIPOS[t].plural}
              </button>
            ))}

            <span style={{ width: 1, height: 22, background: 'var(--borde)', flex: 'none' }} />

            <select
              className="selector"
              style={{ width: 'auto', minWidth: 168 }}
              value={lugar}
              onChange={(e) => setLugar(e.target.value as TipoLugar | '')}
              aria-label="Filtrar por lugar de encuentro"
            >
              <option value="">En cualquier lugar</option>
              {LUGARES.map((l) => <option key={l.tipo} value={l.tipo}>{l.etiqueta}</option>)}
            </select>

            <select className="selector" style={{ width: 'auto', minWidth: 150 }} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoría">
              <option value="">Todas las categorías</option>
              {categoriasDisponibles.map((c) => <option key={c}>{c}</option>)}
            </select>

            <select className="selector" style={{ width: 'auto', minWidth: 148 }} value={orden} onChange={(e) => setOrden(e.target.value as Orden)} aria-label="Ordenar">
              <option value="recientes">Más recientes</option>
              <option value="por-expirar">Por expirar</option>
              <option value="populares">Más contactados</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
            </select>

            <button className="chip" aria-pressed={soloGratis} onClick={() => setSoloGratis((v) => !v)}>
              <Icono nombre="destello" tam={14} /> Gratis
            </button>

            {hayFiltros && (
              <button className="btn btn-fantasma btn-chico" onClick={limpiar}>
                <Icono nombre="cerrar" tam={14} /> Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="contenedor contenedor-ancho seccion" style={{ paddingTop: 22 }}>
        <div className="fila-entre" style={{ marginBottom: 16 }}>
          <span className="chico tenue">
            <strong className="numero">{formatearNumero(resultados.length)}</strong> {resultados.length === 1 ? 'aviso activo' : 'avisos activos'}
          </span>
          <div className="fila" style={{ gap: 4 }}>
            <button className="btn btn-fantasma btn-chico" aria-pressed={verMapa} onClick={() => setVerMapa((v) => !v)}>
              <Icono nombre="mapa" tam={15} /> {verMapa ? 'Ocultar mapa' : 'Ver en el mapa'}
            </button>
            <button className="btn btn-fantasma btn-icono btn-chico" aria-pressed={vista === 'cuadricula'} onClick={() => setVista('cuadricula')} aria-label="Ver como cuadrícula">
              <Icono nombre="cuadricula" tam={16} />
            </button>
            <button className="btn btn-fantasma btn-icono btn-chico" aria-pressed={vista === 'lista'} onClick={() => setVista('lista')} aria-label="Ver como lista">
              <Icono nombre="lista" tam={16} />
            </button>
          </div>
        </div>

        {verMapa && resultados.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <Mapa
              alto="alto"
              centro={resultados[0].ubicacion.punto}
              zoom={13}
              puntos={resultados.map((p) => ({
                id: p.id,
                punto: p.ubicacion.punto,
                color: TIPOS[p.type].color,
                titulo: p.titulo,
                alPulsar: () => setAbierto(p),
              }))}
            />
            <p className="mini muy-tenue" style={{ marginTop: 8 }}>
              Los puntos son referenciales: marcan dónde se propone juntarse, no el domicilio de nadie.
            </p>
          </div>
        )}

        {resultados.length === 0 ? (
          <Vacio
            icono="buscar"
            titulo="No encontramos avisos con esos filtros"
            texto="Prueba quitando algún filtro o publica tú lo que estás buscando: mucha gente responde a los avisos de búsqueda."
            accion={
              <div className="fila" style={{ justifyContent: 'center', gap: 8 }}>
                <button className="btn" onClick={limpiar}>Limpiar filtros</button>
                <button className="btn btn-primario" onClick={() => navegar('/publicar')}>
                  <Icono nombre="mas" tam={16} /> Publicar aviso
                </button>
              </div>
            }
          />
        ) : (
          <div className={`grilla-avisos${vista === 'lista' ? ' lista' : ''}`}>
            {resultados.map((p) => (
              <TarjetaAviso key={p.id} post={p} alAbrir={setAbierto} />
            ))}
          </div>
        )}
      </div>

      <DetalleAviso post={postAbierto} alCerrar={cerrarDetalle} />
    </>
  )
}
