import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api'
import { CAMPUS, PLANES, RUBROS_EMPRENDIMIENTO } from '../lib/constants'
import { compacto, fechaLarga, formatearPrecio, handleInstagram, linkInstagram, linkWhatsApp, normalizar } from '../lib/format'
import type { Campus, Emprendimiento, PlanId } from '../lib/types'
import { Icono } from '../components/Iconos'
import { Modal, Nota, Vacio } from '../components/UI'
import { useApp } from '../state/contexto'

const PLAN_ETIQUETA: Record<PlanId, string> = { vitrina: 'Vitrina', emprendedor: 'Emprendedor', pro: 'Pro' }

export const Emprendimientos = () => {
  const { usuario, revision, avisar } = useApp()
  const [params, setParams] = useSearchParams()
  const [rubro, setRubro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Emprendimiento | null>(null)
  const [registrando, setRegistrando] = useState(false)

  const lista = useMemo(() => {
    void revision
    const q = normalizar(busqueda)
    return api.listarEmprendimientos().filter((e) => {
      if (rubro && e.rubro !== rubro) return false
      if (q && !normalizar(`${e.nombre} ${e.lema} ${e.descripcion} ${e.rubro}`).includes(q)) return false
      return true
    })
  }, [rubro, busqueda, revision])

  // Deep link desde el buscador rápido y desde la portada.
  useEffect(() => {
    const id = params.get('abrir')
    if (!id) return
    const e = api.obtenerEmprendimiento(id)
    if (e) setAbierto(e)
  }, [params, revision])

  const cerrar = () => {
    setAbierto(null)
    if (params.get('abrir')) setParams({})
  }

  const abrirFicha = (e: Emprendimiento) => {
    setAbierto(e)
    api.registrarEvento('vista', e.id, 'emprendimiento')
  }

  const clicRed = (e: Emprendimiento) => api.registrarEvento('clic-contacto', e.id, 'emprendimiento')

  const actual = abierto ? api.obtenerEmprendimiento(abierto.id) ?? abierto : null
  const plan = actual ? PLANES.find((p) => p.id === actual.plan)! : null

  return (
    <>
      <div className="contenedor contenedor-ancho seccion">
        <div className="seccion-titulo">
          <div>
            <h1>Emprendimientos UCN</h1>
            <p>
              Negocios llevados por estudiantes de la universidad. Los planes mensuales de esta sección son lo que
              financia el hosting y el desarrollo de toda la plataforma.
            </p>
          </div>
          <div className="fila" style={{ gap: 8 }}>
            <Link to="/planes" className="btn btn-chico">Ver planes</Link>
            <button className="btn btn-primario btn-chico" onClick={() => setRegistrando(true)}>
              <Icono nombre="mas" tam={16} /> Registrar el mío
            </button>
          </div>
        </div>

        <div className="fila-envuelve" style={{ marginBottom: 22, gap: 10 }}>
          <div className="buscador crecer" style={{ minWidth: 230 }}>
            <Icono nombre="buscar" tam={17} />
            <input
              className="entrada"
              placeholder="Tortas, fotografía, asesorías…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar emprendimientos"
            />
          </div>
          <select className="selector" style={{ width: 'auto', minWidth: 190 }} value={rubro} onChange={(e) => setRubro(e.target.value)} aria-label="Filtrar por rubro">
            <option value="">Todos los rubros</option>
            {RUBROS_EMPRENDIMIENTO.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>

        {lista.length === 0 ? (
          <Vacio
            icono="tienda"
            titulo="No hay emprendimientos con ese filtro"
            texto="Prueba con otro rubro, o registra el tuyo: partir en el plan Vitrina no cuesta nada."
            accion={<button className="btn btn-primario" onClick={() => setRegistrando(true)}>Registrar mi emprendimiento</button>}
          />
        ) : (
          <div className="grilla-emp">
            {lista.map((e) => (
              <button key={e.id} className={`emp-tarjeta${e.plan === 'pro' ? ' pro' : ''}`} onClick={() => abrirFicha(e)}>
                <div className="fila">
                  <span className="emp-logo" style={{ background: e.logo }}>{e.nombre.slice(0, 2).toUpperCase()}</span>
                  <div className="crecer">
                    <div className="fuerte">{e.nombre}</div>
                    <div className="mini tenue">{e.rubro}</div>
                  </div>
                  {e.plan === 'pro' && (
                    <span className="etiqueta etiqueta-marca"><Icono nombre="estrella" tam={11} /> Pro</span>
                  )}
                </div>

                <p className="chico tenue recorte-3" style={{ margin: 0 }}>
                  {e.plan === 'vitrina' ? e.lema : e.descripcion}
                </p>

                {e.plan !== 'vitrina' && e.catalogo?.length ? (
                  <div className="fila-envuelve" style={{ gap: 5 }}>
                    {e.catalogo.slice(0, 2).map((c) => (
                      <span key={c.titulo} className="etiqueta etiqueta-contorno">
                        {c.titulo}
                        {c.precio ? ` · ${formatearPrecio(c.precio)}` : ''}
                      </span>
                    ))}
                    {e.catalogo.length > 2 && <span className="etiqueta">+{e.catalogo.length - 2}</span>}
                  </div>
                ) : null}

                <div className="fila-entre" style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--borde)' }}>
                  <div className="emp-redes">
                    {e.instagram && <span className="mini tenue fila" style={{ gap: 4 }}><Icono nombre="instagram" tam={13} />@{e.instagram}</span>}
                  </div>
                  <span className="mini muy-tenue fila" style={{ gap: 4 }}>
                    <Icono nombre="ojo" tam={13} />{compacto(e.stats.vistas)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28 }}>
          <Nota tono="marca" icono="info">
            <strong>Lo que pagan los emprendimientos no se lo lleva nadie.</strong> Financia el dominio, el servidor y el
            desarrollo de la bolsa, y la rendición se publica cada semestre en la asamblea. Publicar avisos comunes y
            usar el foro es y seguirá siendo gratis.
          </Nota>
        </div>
      </div>

      {/* ── Ficha del emprendimiento ──────────────────────────────────── */}
      {actual && plan && (
        <Modal
          abierto
          alCerrar={cerrar}
          ancho
          titulo={actual.nombre}
          subtitulo={
            <span className="fila-envuelve" style={{ gap: 8 }}>
              <span className="etiqueta etiqueta-contorno">{actual.rubro}</span>
              <span className={`etiqueta${actual.plan === 'pro' ? ' etiqueta-marca' : ''}`}>Plan {PLAN_ETIQUETA[actual.plan]}</span>
              <span className="etiqueta etiqueta-contorno">{actual.campus.split('—')[0].trim()}</span>
            </span>
          }
        >
          <div className="detalle-rejilla">
            <div className="columna" style={{ gap: 18 }}>
              <div className="fila" style={{ gap: 14 }}>
                <span className="emp-logo" style={{ background: actual.logo, width: 62, height: 62, fontSize: '1.2rem' }}>
                  {actual.nombre.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div className="fuerte">{actual.lema}</div>
                  <div className="chico tenue">
                    Por {actual.dueno} · {actual.carrera}
                  </div>
                </div>
              </div>

              <p className="detalle-descripcion">
                {actual.plan === 'vitrina' ? actual.descripcion.slice(0, plan.limiteCaracteres) : actual.descripcion}
              </p>

              {actual.plan !== 'vitrina' && actual.catalogo?.length ? (
                <div>
                  <div className="mayus tenue" style={{ marginBottom: 8 }}>Catálogo</div>
                  <div className="columna" style={{ gap: 0 }}>
                    {actual.catalogo.map((c) => (
                      <div className="dato" key={c.titulo}>
                        <span className="crecer">{c.titulo}</span>
                        <span className="dato-val">{c.precio ? formatearPrecio(c.precio) : c.nota}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mini muy-tenue" style={{ marginTop: 8 }}>
                    Precios referenciales publicados por el emprendimiento. La FEUCN no intermedia ni cobra comisión.
                  </p>
                </div>
              ) : (
                <Nota icono="candado">
                  Este emprendimiento está en el plan Vitrina. Con el plan Emprendedor podría mostrar acá su catálogo,
                  sus redes y una descripción larga.
                </Nota>
              )}
            </div>

            <aside className="columna" style={{ gap: 14 }}>
              <div className="panel panel-relleno columna" style={{ gap: 10 }}>
                <div className="mayus tenue">Dónde encontrarlos</div>
                <div className="emp-redes" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  {actual.instagram && (
                    <a className="red-pastilla red-ig" href={linkInstagram(actual.instagram)} target="_blank" rel="noreferrer" onClick={() => clicRed(actual)}>
                      <Icono nombre="instagram" tam={16} /> {handleInstagram(actual.instagram)}
                    </a>
                  )}
                  {actual.plan !== 'vitrina' && actual.tiktok && (
                    <a className="red-pastilla" href={`https://tiktok.com/@${actual.tiktok}`} target="_blank" rel="noreferrer" onClick={() => clicRed(actual)}>
                      <Icono nombre="tiktok" tam={16} /> @{actual.tiktok}
                    </a>
                  )}
                  {actual.plan !== 'vitrina' && actual.web && (
                    <a className="red-pastilla" href={actual.web} target="_blank" rel="noreferrer" onClick={() => clicRed(actual)}>
                      <Icono nombre="web" tam={16} /> Sitio web
                    </a>
                  )}
                  {actual.whatsapp && (
                    <a
                      className="red-pastilla"
                      href={linkWhatsApp(actual.whatsapp, `Hola ${actual.nombre}, los vi en el directorio de la FEUCN.`)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => clicRed(actual)}
                    >
                      <Icono nombre="whatsapp" tam={16} /> Escribir por WhatsApp
                    </a>
                  )}
                </div>
              </div>

              <div className="panel panel-relleno">
                <div className="mayus tenue" style={{ marginBottom: 6 }}>Su ficha en números</div>
                <div className="dato"><span className="dato-lbl">Visitas</span><span className="dato-val numero">{compacto(actual.stats.vistas)}</span></div>
                <div className="dato"><span className="dato-lbl">Clics a sus redes</span><span className="dato-val numero">{compacto(actual.stats.clicsContacto)}</span></div>
                <div className="dato"><span className="dato-lbl">En el directorio desde</span><span className="dato-val">{fechaLarga(actual.creadoEn)}</span></div>
              </div>

              {usuario?.id === actual.duenoId && (
                <Nota tono={actual.suscripcionStatus === 'vencida' ? 'critico' : actual.suscripcionStatus === 'por-vencer' ? 'aviso' : 'ok'} icono="tarjeta">
                  {actual.plan === 'vitrina' ? (
                    <>Estás en el plan gratuito. <Link to="/planes">Mejora tu plan</Link> para mostrar catálogo y redes.</>
                  ) : actual.suscripcionStatus === 'vencida' ? (
                    <>Tu suscripción venció. La ficha volvió al plan Vitrina hasta que la renueves.</>
                  ) : (
                    <>Tu plan {PLAN_ETIQUETA[actual.plan]} está vigente hasta el {fechaLarga(actual.suscripcionHasta)}.</>
                  )}
                </Nota>
              )}
            </aside>
          </div>
        </Modal>
      )}

      <RegistroEmprendimiento abierto={registrando} alCerrar={() => setRegistrando(false)} alListo={(m) => avisar(m, 'ok')} />
    </>
  )
}

/* ── Alta de emprendimiento ────────────────────────────────────────────── */

const RegistroEmprendimiento = ({
  abierto,
  alCerrar,
  alListo,
}: {
  abierto: boolean
  alCerrar: () => void
  alListo: (mensaje: string) => void
}) => {
  const { usuario } = useApp()
  const [nombre, setNombre] = useState('')
  const [lema, setLema] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [rubro, setRubro] = useState(RUBROS_EMPRENDIMIENTO[0])
  const [instagram, setInstagram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [plan, setPlan] = useState<PlanId>('emprendedor')
  const [meses, setMeses] = useState(3)
  const [campus, setCampus] = useState<Campus>(usuario?.campus ?? CAMPUS[0].id)
  const [enviando, setEnviando] = useState(false)

  const planSel = PLANES.find((p) => p.id === plan)!
  const valido = nombre.trim().length > 2 && lema.trim().length > 4 && descripcion.trim().length > 30

  const enviar = async () => {
    if (!usuario || !valido) return
    setEnviando(true)
    try {
      const creado = await api.crearEmprendimiento({
        nombre: nombre.trim(),
        lema: lema.trim(),
        descripcion: descripcion.trim().slice(0, planSel.limiteCaracteres),
        rubro,
        logo: usuario.avatar,
        instagram: instagram.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        duenoId: usuario.id,
        dueno: usuario.nombre,
        carrera: usuario.carrera,
        campus,
        plan,
      })
      if (plan !== 'vitrina') {
        await api.solicitarPlan({
          emprendimientoId: creado.id,
          emprendimiento: creado.nombre,
          plan,
          solicitanteId: usuario.id,
          solicitante: usuario.nombre,
          correo: usuario.correo,
          meses,
        })
      }
      alListo(
        plan === 'vitrina'
          ? 'Emprendimiento enviado a revisión'
          : 'Solicitud enviada. Tesorería FEUCN te escribe para coordinar el pago.',
      )
      alCerrar()
      setNombre(''); setLema(''); setDescripcion(''); setInstagram(''); setWhatsapp('')
    } finally {
      setEnviando(false)
    }
  }

  if (!abierto) return null

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      ancho
      titulo="Registrar mi emprendimiento"
      subtitulo="Queda en revisión de la FEUCN antes de aparecer en el directorio."
      pie={
        <>
          <button className="btn btn-fantasma" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario" onClick={enviar} disabled={!valido || enviando || !usuario}>
            <Icono nombre="enviar" tam={16} /> {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </>
      }
    >
      {!usuario ? (
        <Nota tono="aviso" icono="candado">Entra con tu cuenta UCN para registrar un emprendimiento.</Nota>
      ) : (
        <div className="columna" style={{ gap: 18 }}>
          <div className="grupo-campos grupo-2">
            <div className="campo">
              <label htmlFor="e-nombre">Nombre</label>
              <input id="e-nombre" className="entrada" data-autofoco value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Dulce Norte" />
            </div>
            <div className="campo">
              <label htmlFor="e-rubro">Rubro</label>
              <select id="e-rubro" className="selector" value={rubro} onChange={(e) => setRubro(e.target.value)}>
                {RUBROS_EMPRENDIMIENTO.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="campo">
            <label htmlFor="e-lema">Lema</label>
            <input id="e-lema" className="entrada" value={lema} onChange={(e) => setLema(e.target.value)} placeholder="Tortas y kuchen hechos entre certámenes" maxLength={80} />
          </div>

          <div className="campo">
            <label htmlFor="e-desc">Descripción</label>
            <textarea
              id="e-desc"
              className="area"
              value={descripcion}
              maxLength={planSel.limiteCaracteres}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Qué venden, cómo trabajan, plazos de entrega, dónde entregan…"
            />
            <div className="fila-entre">
              <span className="campo-ayuda">El plan {planSel.nombre} permite {planSel.limiteCaracteres} caracteres.</span>
              <span className={`contador-car${descripcion.length >= planSel.limiteCaracteres ? ' limite' : ''}`}>
                {descripcion.length}/{planSel.limiteCaracteres}
              </span>
            </div>
          </div>

          <div className="grupo-campos grupo-2">
            <div className="campo">
              <label htmlFor="e-ig">Instagram</label>
              <input id="e-ig" className="entrada" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="tu.emprendimiento" />
            </div>
            <div className="campo">
              <label htmlFor="e-wa">WhatsApp</label>
              <input id="e-wa" className="entrada" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+56 9 1234 5678" />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="e-campus">Campus base</label>
            <select id="e-campus" className="selector" value={campus} onChange={(e) => setCampus(e.target.value as Campus)}>
              {CAMPUS.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
            </select>
          </div>

          <div className="campo">
            <span className="campo-titulo">Plan</span>
            <div className="opciones opciones-3">
              {PLANES.map((p) => (
                <button key={p.id} type="button" className="opcion" aria-pressed={plan === p.id} onClick={() => setPlan(p.id)}>
                  <span>
                    <span className="opcion-titulo">{p.nombre}</span>
                    <span className="opcion-texto">
                      {p.precioMensual === 0 ? 'Gratis' : `${formatearPrecio(p.precioMensual)} al mes`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {plan !== 'vitrina' && (
            <>
              <div className="campo">
                <span className="campo-titulo">¿Por cuántos meses?</span>
                <div className="fila-envuelve">
                  {[1, 3, 6, 12].map((m) => (
                    <button key={m} type="button" className="chip" aria-pressed={meses === m} onClick={() => setMeses(m)}>
                      {m} {m === 1 ? 'mes' : 'meses'}
                    </button>
                  ))}
                </div>
                <span className="campo-ayuda">
                  Total referencial: <strong>{formatearPrecio(planSel.precioMensual * meses)}</strong>
                </span>
              </div>

              <Nota tono="marca" icono="escudo">
                <strong>Acá no se paga nada.</strong> Esto genera una solicitud; tesorería FEUCN te contacta por correo
                para coordinar el pago por los canales oficiales de la federación y recién entonces se activa el plan.
              </Nota>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
