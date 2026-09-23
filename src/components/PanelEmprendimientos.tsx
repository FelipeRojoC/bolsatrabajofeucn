import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { PLANES } from '../lib/constants'
import { fechaLarga, normalizar } from '../lib/format'
import type { Emprendimiento } from '../lib/types'
import { Icono } from './Iconos'
import { Modal, Nota, Vacio } from './UI'
import { useApp } from '../state/contexto'

type Filtro = 'todos' | 'pendiente' | 'sin-dueno' | 'destacables'

/**
 * Directorio visto desde el panel.
 *
 * Además de aprobar fichas, es donde se enlaza cada emprendimiento con la
 * cuenta de quien lo lleva: sin ese enlace, la persona no puede marcar sus
 * avisos como destacados aunque tenga el plan pagado.
 */
export const PanelEmprendimientos = () => {
  const { usuario, revision, avisar } = useApp()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [enlazando, setEnlazando] = useState<Emprendimiento | null>(null)

  const todos = useMemo(() => {
    void revision
    return api.listarEmprendimientos(false)
  }, [revision])

  const visibles = useMemo(() => {
    const q = normalizar(busqueda).trim()
    return todos.filter((e) => {
      if (filtro === 'pendiente' && e.status !== 'pendiente') return false
      if (filtro === 'sin-dueno' && e.duenoId) return false
      if (filtro === 'destacables' && (e.plan === 'vitrina' || e.status !== 'aprobado')) return false
      if (!q) return true
      return normalizar(`${e.nombre} ${e.rubro} ${e.dueno} ${e.lema}`).includes(q)
    })
  }, [todos, busqueda, filtro, revision])

  const conteos = useMemo(
    () => ({
      todos: todos.length,
      pendiente: todos.filter((e) => e.status === 'pendiente').length,
      'sin-dueno': todos.filter((e) => !e.duenoId).length,
      destacables: todos.filter((e) => e.plan !== 'vitrina' && e.status === 'aprobado').length,
    }),
    [todos],
  )

  const decidir = async (e: Emprendimiento, accion: 'aprobar' | 'rechazar') => {
    await api.moderarEmprendimiento(e.id, accion, { revisadoPor: usuario?.nombre ?? 'Moderación FEUCN' })
    avisar(accion === 'aprobar' ? 'Ficha publicada' : 'Ficha rechazada', 'ok')
  }

  const desenlazar = async (e: Emprendimiento) => {
    const r = await api.desenlazarEmprendimiento(e.id)
    avisar(
      r.ok ? `${e.nombre} quedó sin cuenta enlazada y sus avisos dejaron de destacarse` : r.motivo,
      r.ok ? 'ok' : 'error',
    )
  }

  const FILTROS: { id: Filtro; texto: string }[] = [
    { id: 'todos', texto: 'Todos' },
    { id: 'pendiente', texto: 'Por revisar' },
    { id: 'sin-dueno', texto: 'Sin cuenta' },
    { id: 'destacables', texto: 'Con plan pagado' },
  ]

  return (
    <>
      <Nota tono="marca" icono="destello">
        <strong>El marco de colores se habilita acá.</strong> Enlaza el emprendimiento con el correo de quien lo
        lleva y, si tiene plan Emprendedor o Pro al día, esa persona podrá marcar sus avisos para que salgan
        destacados en el feed.
      </Nota>

      <div className="fila-envuelve" style={{ gap: 10, margin: '18px 0 16px' }}>
        <div className="buscador crecer" style={{ minWidth: 230 }}>
          <Icono nombre="buscar" tam={17} />
          <input
            className="entrada"
            placeholder="Buscar por nombre, rubro o responsable…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar emprendimientos"
          />
        </div>
      </div>

      <div className="pestanas" role="tablist" style={{ marginBottom: 16 }}>
        {FILTROS.map((f) => (
          <button key={f.id} className="pestana" role="tab" aria-selected={filtro === f.id} onClick={() => setFiltro(f.id)}>
            {f.texto}
            <span className="pestana-cuenta">{conteos[f.id]}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <Vacio icono="tienda" titulo="Nada en esta lista" texto="Cuando lleguen fichas nuevas van a aparecer acá." />
      ) : (
        <div className="cola">
          {visibles.map((e) => {
            const plan = PLANES.find((p) => p.id === e.plan)!
            const puedeDestacar = e.plan !== 'vitrina' && e.status === 'aprobado'
            return (
              <article key={e.id} className={`cola-item ${e.status === 'pendiente' ? 'riesgo-medio' : 'riesgo-bajo'}`}>
                <div className="columna" style={{ gap: 10 }}>
                  <div className="fila">
                    <span className="emp-logo" style={{ background: e.logo, width: 42, height: 42, fontSize: '0.9rem' }}>
                      {e.nombre.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="crecer">
                      <h3 style={{ fontSize: '1rem' }}>{e.nombre}</h3>
                      <span className="mini tenue">{e.rubro} · plan {plan.nombre}</span>
                    </div>
                    {e.status === 'pendiente' && <span className="etiqueta etiqueta-aviso">Por revisar</span>}
                    {e.status === 'rechazado' && <span className="etiqueta etiqueta-critico">Rechazada</span>}
                    {puedeDestacar && (
                      <span className="etiqueta etiqueta-marca">
                        <span className="glifo-vitral" aria-hidden="true" /> Destaca
                      </span>
                    )}
                  </div>

                  <p className="chico tenue recorte-3" style={{ margin: 0 }}>{e.descripcion}</p>

                  <div className="fila-envuelve" style={{ gap: 6 }}>
                    {e.duenoId ? (
                      <span className="etiqueta etiqueta-ok">
                        <Icono nombre="usuarios" tam={11} /> {e.dueno}
                      </span>
                    ) : (
                      <span className="etiqueta etiqueta-aviso">
                        <Icono nombre="alerta" tam={11} /> Sin cuenta enlazada
                      </span>
                    )}
                    {e.plan !== 'vitrina' && (
                      <span
                        className={`etiqueta ${e.suscripcionStatus === 'vencida' ? 'etiqueta-critico' : e.suscripcionStatus === 'por-vencer' ? 'etiqueta-aviso' : 'etiqueta-contorno'}`}
                      >
                        {e.suscripcionStatus === 'vencida'
                          ? 'Suscripción vencida'
                          : `Vigente hasta ${fechaLarga(e.suscripcionHasta)}`}
                      </span>
                    )}
                    {e.instagram && <span className="etiqueta etiqueta-contorno">@{e.instagram}</span>}
                  </div>
                </div>

                <div className="cola-acciones">
                  {e.status === 'pendiente' && (
                    <>
                      <button className="btn btn-ok btn-bloque" onClick={() => decidir(e, 'aprobar')}>
                        <Icono nombre="visto" tam={16} /> Publicar ficha
                      </button>
                      <button className="btn btn-peligro btn-bloque btn-chico" onClick={() => decidir(e, 'rechazar')}>
                        <Icono nombre="cerrar" tam={15} /> Rechazar
                      </button>
                    </>
                  )}

                  <button className="btn btn-bloque btn-chico" onClick={() => setEnlazando(e)}>
                    <Icono nombre="usuarios" tam={15} /> {e.duenoId ? 'Cambiar cuenta' : 'Enlazar cuenta'}
                  </button>

                  {e.duenoId && (
                    <button className="btn btn-fantasma btn-bloque btn-chico" onClick={() => desenlazar(e)}>
                      Quitar enlace
                    </button>
                  )}

                  {e.plan === 'vitrina' && (
                    <span className="mini muy-tenue centro">
                      El plan Vitrina no incluye el marco destacado
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {enlazando && (
        <EnlazarCuenta
          key={enlazando.id}
          emprendimiento={enlazando}
          alCerrar={() => setEnlazando(null)}
        />
      )}
    </>
  )
}

/* ── Enlazar ───────────────────────────────────────────────────────────── */

const EnlazarCuenta = ({
  emprendimiento,
  alCerrar,
}: {
  emprendimiento: Emprendimiento
  alCerrar: () => void
}) => {
  const { avisar } = useApp()
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const plan = PLANES.find((p) => p.id === emprendimiento.plan)!

  const enlazar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const r = await api.enlazarEmprendimiento(emprendimiento.id, correo)
      if (!r.ok) return setError(r.motivo)
      avisar(`${emprendimiento.nombre} quedó a nombre de ${r.usuario}`, 'ok')
      alCerrar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo="Enlazar con una cuenta"
      subtitulo={emprendimiento.nombre}
      pie={
        <>
          <button className="btn btn-fantasma" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario" onClick={enlazar} disabled={!correo.trim() || enviando}>
            <Icono nombre="usuarios" tam={16} /> {enviando ? 'Enlazando…' : 'Enlazar'}
          </button>
        </>
      }
    >
      <form className="columna" style={{ gap: 16 }} onSubmit={enlazar}>
        <div className="campo">
          <label htmlFor="enlace-correo">Correo de quien lleva el emprendimiento</label>
          <input
            id="enlace-correo"
            className="entrada"
            type="email"
            data-autofoco
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="nombre.apellido@alumnos.ucn.cl"
            aria-invalid={Boolean(error)}
          />
          {error ? (
            <span className="campo-error">{error}</span>
          ) : (
            <span className="campo-ayuda">
              Tiene que ser una cuenta que ya exista. Si todavía no se registra, pídele que entre primero a crear su
              cuenta con el correo UCN.
            </span>
          )}
        </div>

        {emprendimiento.duenoId && (
          <Nota tono="aviso" icono="alerta">
            Ahora está a nombre de <strong>{emprendimiento.dueno}</strong>. Al enlazar otra cuenta, esa persona pierde
            el control de la ficha y ya no podrá destacar sus avisos con este emprendimiento.
          </Nota>
        )}

        {emprendimiento.plan === 'vitrina' ? (
          <Nota icono="info">
            El plan Vitrina no incluye el marco destacado. La persona va a poder administrar la ficha, pero para que
            sus avisos salgan con el marco hay que subirla a Emprendedor o Pro desde Suscripciones.
          </Nota>
        ) : (
          <Nota tono="ok" icono="destello">
            Con el plan <strong>{plan.nombre}</strong> al día, esa persona va a ver la casilla para destacar sus
            avisos con el marco de colores.
          </Nota>
        )}
      </form>
    </Modal>
  )
}
