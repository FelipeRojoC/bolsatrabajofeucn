import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../lib/api'
import { CATEGORIAS } from '../lib/constants'
import { normalizar } from '../lib/format'
import type { Post } from '../lib/types'
import { TarjetaAviso } from '../components/TarjetaAviso'
import { DetalleAviso } from '../components/DetalleAviso'
import { Icono } from '../components/Iconos'
import { Nota, Vacio } from '../components/UI'
import { useApp } from '../state/contexto'
import { useTic } from '../components/useTic'

type Pestana = 'todos' | 'perdido' | 'encontrado' | 'resueltos'

/**
 * Cruce automático entre lo perdido y lo encontrado: misma categoría, campus
 * cercano y palabras en común. Es lo que convierte el foro en algo más que un
 * muro de mensajes sueltos.
 */
const sugerirCoincidencias = (posts: Post[]) => {
  const perdidos = posts.filter((p) => p.lostKind === 'perdido' && !p.resuelto)
  const encontrados = posts.filter((p) => p.lostKind === 'encontrado' && !p.resuelto)
  const pares: { perdido: Post; encontrado: Post; puntaje: number; razon: string }[] = []

  for (const p of perdidos) {
    for (const e of encontrados) {
      let puntaje = 0
      const razones: string[] = []
      if (p.categoria === e.categoria) {
        puntaje += 3
        razones.push(`ambos en ${p.categoria.toLowerCase()}`)
      }
      if (p.ubicacion.zona === e.ubicacion.zona) {
        puntaje += 2
        razones.push(`los dos en ${p.ubicacion.zona.toLowerCase()}`)
      } else if (p.ubicacion.tipo === e.ubicacion.tipo) {
        puntaje += 1
      }
      const palabrasP = new Set(normalizar(p.titulo).split(/\W+/).filter((w) => w.length > 3))
      const comunes = normalizar(e.titulo).split(/\W+/).filter((w) => w.length > 3 && palabrasP.has(w))
      if (comunes.length) {
        puntaje += comunes.length
        razones.push(`coinciden en "${comunes[0]}"`)
      }
      if (puntaje >= 4) pares.push({ perdido: p, encontrado: e, puntaje, razon: razones.join(', ') })
    }
  }
  return pares.sort((a, b) => b.puntaje - a.puntaje).slice(0, 3)
}

export const Perdidos = () => {
  const { revision } = useApp()
  const navegar = useNavigate()
  const [pestana, setPestana] = useState<Pestana>('todos')
  const [categoria, setCategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Post | null>(null)
  useTic()

  const { lista, conteos, coincidencias } = useMemo(() => {
    void revision
    const todos = api.filtrarPosts(api.listarTodos(), {
      tipos: ['perdido'],
      status: ['aprobado', 'archivado'],
      busqueda,
      categorias: categoria ? [categoria] : undefined,
      orden: 'recientes',
    })

    const filtrada = todos.filter((p) => {
      if (pestana === 'todos') return !p.resuelto
      if (pestana === 'resueltos') return Boolean(p.resuelto)
      return p.lostKind === pestana && !p.resuelto
    })

    return {
      lista: filtrada,
      conteos: {
        todos: todos.filter((p) => !p.resuelto).length,
        perdido: todos.filter((p) => p.lostKind === 'perdido' && !p.resuelto).length,
        encontrado: todos.filter((p) => p.lostKind === 'encontrado' && !p.resuelto).length,
        resueltos: todos.filter((p) => p.resuelto).length,
      },
      coincidencias: sugerirCoincidencias(todos),
    }
  }, [pestana, categoria, busqueda, revision])

  const postAbierto = abierto ? api.obtenerPost(abierto.id) ?? abierto : null

  const PESTANAS: { id: Pestana; texto: string }[] = [
    { id: 'todos', texto: 'Casos abiertos' },
    { id: 'perdido', texto: 'Se perdió' },
    { id: 'encontrado', texto: 'Alguien lo encontró' },
    { id: 'resueltos', texto: 'Resueltos' },
  ]

  return (
    <>
      <div className="contenedor contenedor-ancho seccion">
        <div className="seccion-titulo">
          <div>
            <h1>¿Se perdió esto?</h1>
            <p>
              El foro de objetos perdidos y encontrados de la UCN. Publica lo que se te perdió o lo que encontraste y
              deja que la comunidad haga el resto: acá el "yo lo vi el martes" vale oro.
            </p>
          </div>
          <button className="btn btn-primario" onClick={() => navegar('/publicar?tipo=perdido')}>
            <Icono nombre="mas" tam={17} /> Publicar un caso
          </button>
        </div>

        {coincidencias.length > 0 && (
          <div className="columna" style={{ gap: 10, marginBottom: 24 }}>
            <div className="mayus tenue">Posibles coincidencias detectadas</div>
            {coincidencias.map((c) => (
              <div className="coincidencia" key={`${c.perdido.id}-${c.encontrado.id}`}>
                <Icono nombre="destello" tam={18} style={{ color: 'var(--acento)', flex: 'none', marginTop: 2 }} />
                <div className="crecer">
                  <div className="chico">
                    <button className="fuerte" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--tinta)', textAlign: 'left' }} onClick={() => setAbierto(c.perdido)}>
                      «{c.perdido.titulo}»
                    </button>
                    <span className="tenue"> podría ser </span>
                    <button className="fuerte" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--tinta)', textAlign: 'left' }} onClick={() => setAbierto(c.encontrado)}>
                      «{c.encontrado.titulo}»
                    </button>
                  </div>
                  <div className="mini tenue">Coinciden porque {c.razon}.</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="fila-envuelve" style={{ marginBottom: 18, gap: 10 }}>
          <div className="buscador crecer" style={{ minWidth: 220 }}>
            <Icono nombre="buscar" tam={17} />
            <input
              className="entrada"
              placeholder="TNE, llaves, audífonos…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar en el foro"
            />
          </div>
          <select className="selector" style={{ width: 'auto', minWidth: 180 }} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoría">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.perdido.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="pestanas" role="tablist" style={{ marginBottom: 20 }}>
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              className="pestana"
              role="tab"
              aria-selected={pestana === p.id}
              onClick={() => setPestana(p.id)}
            >
              {p.texto}
              <span className="pestana-cuenta">{conteos[p.id]}</span>
            </button>
          ))}
        </div>

        {lista.length === 0 ? (
          <Vacio
            icono="perdido"
            titulo={pestana === 'resueltos' ? 'Todavía no hay casos cerrados acá' : 'No hay casos abiertos con ese filtro'}
            texto="Si se te perdió algo en el campus, publícalo: la mayoría de los casos se resuelve en menos de dos días."
            accion={
              <button className="btn btn-primario" onClick={() => navegar('/publicar?tipo=perdido')}>
                <Icono nombre="mas" tam={16} /> Publicar un caso
              </button>
            }
          />
        ) : (
          <div className="grilla-avisos">
            {lista.map((p) => (
              <TarjetaAviso key={p.id} post={p} alAbrir={setAbierto} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 26 }}>
          <Nota tono="marca" icono="info">
            <strong>Regla del foro:</strong> si encontraste algo con datos personales (TNE, cédula, carnet), no publiques
            el RUT ni el número. Déjalo en la oficina de la FEUCN o en portería y avisa acá; su dueño lo retira con su
            cédula.
          </Nota>
        </div>
      </div>

      <DetalleAviso post={postAbierto} alCerrar={() => setAbierto(null)} />
    </>
  )
}
