import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api'
import { CAMPUS, CATEGORIAS, MAX_DIAS_VIGENCIA, TIPOS } from '../lib/constants'
import { comprimirImagen } from '../lib/imagen'
import { formatearPrecio } from '../lib/format'
import type { Campus, ContactChannel, GeoPoint, LostKind, PostType } from '../lib/types'
import { Icono } from '../components/Iconos'
import { Nota, PortadaGenerada } from '../components/UI'
import { Mapa } from '../components/Mapa'
import { useApp } from '../state/contexto'

const PASOS = ['Tipo', 'Detalles', 'Dónde', 'Contacto']

export const Publicar = () => {
  const { usuario, avisar } = useApp()
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const archivoRef = useRef<HTMLInputElement>(null)

  const [paso, setPaso] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})

  const [type, setType] = useState<PostType>((params.get('tipo') as PostType) || 'venta')
  const [lostKind, setLostKind] = useState<LostKind>('perdido')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [precio, setPrecio] = useState('')
  const [precioNota, setPrecioNota] = useState('')
  const [estadoArticulo, setEstadoArticulo] = useState<'nuevo' | 'como-nuevo' | 'usado'>('usado')
  const [imagenes, setImagenes] = useState<string[]>([])
  const [campus, setCampus] = useState<Campus>(usuario?.campus ?? CAMPUS[0].id)
  const [zona, setZona] = useState('')
  const [referencia, setReferencia] = useState('')
  const [punto, setPunto] = useState<GeoPoint>(CAMPUS.find((c) => c.id === (usuario?.campus ?? CAMPUS[0].id))!.punto)
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [preferido, setPreferido] = useState<ContactChannel>('whatsapp')
  const [dias, setDias] = useState(MAX_DIAS_VIGENCIA)
  const [acepta, setAcepta] = useState(false)

  const zonasCampus = CAMPUS.find((c) => c.id === campus)?.zonas ?? []
  const esForo = type === 'perdido'

  // Mismo cálculo que corre al publicar: se muestra antes para que no sorprenda.
  const riesgo = useMemo(
    () => api.evaluarRiesgo(titulo, descripcion, precio ? Number(precio) : undefined),
    [titulo, descripcion, precio],
  )

  if (!usuario) {
    return (
      <div className="contenedor seccion">
        <div className="panel panel-relleno centro" style={{ padding: 44, maxWidth: 520, margin: '0 auto' }}>
          <Icono nombre="candado" tam={30} className="tenue" style={{ margin: '0 auto 14px' }} />
          <h2>Entra para publicar</h2>
          <p className="tenue" style={{ margin: '10px 0 20px' }}>
            Solo la comunidad UCN puede publicar. Usa el menú de arriba a la derecha para entrar con una cuenta de
            demostración.
          </p>
          <button className="btn btn-primario" onClick={() => navegar('/')}>Volver al inicio</button>
        </div>
      </div>
    )
  }

  const validar = (p: number) => {
    const e: Record<string, string> = {}
    if (p === 1) {
      if (titulo.trim().length < 8) e.titulo = 'Escribe un título de al menos 8 caracteres.'
      if (titulo.length > 90) e.titulo = 'El título no puede pasar de 90 caracteres.'
      if (descripcion.trim().length < 30) e.descripcion = 'Cuenta un poco más: mínimo 30 caracteres.'
      if (!categoria) e.categoria = 'Elige una categoría.'
      if (!esForo && precio !== '' && Number(precio) < 0) e.precio = 'El precio no puede ser negativo.'
    }
    if (p === 2) {
      if (!zona) e.zona = 'Elige un punto de encuentro.'
    }
    if (p === 3) {
      if (preferido === 'whatsapp' && whatsapp.replace(/\D/g, '').length < 8) {
        e.whatsapp = 'Escribe un número válido o cambia tu canal preferido.'
      }
      if (!acepta) e.acepta = 'Tienes que aceptar las reglas de la bolsa.'
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const avanzar = () => {
    if (!validar(paso)) return
    setPaso((p) => Math.min(PASOS.length - 1, p + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const subirFotos = async (archivos: FileList | null) => {
    if (!archivos?.length) return
    const restantes = 3 - imagenes.length
    if (restantes <= 0) return avisar('Máximo 3 fotos por aviso', 'error')
    try {
      const nuevas = await Promise.all([...archivos].slice(0, restantes).map((f) => comprimirImagen(f)))
      setImagenes((prev) => [...prev, ...nuevas])
    } catch {
      avisar('No pudimos procesar esa imagen', 'error')
    }
  }

  const publicar = async () => {
    if (!validar(3)) return
    setEnviando(true)
    try {
      const creado = await api.crearPost({
        type,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        precio: esForo || precio === '' ? undefined : Number(precio),
        precioNota: precioNota.trim() || undefined,
        categoria,
        estadoArticulo: type === 'venta' ? estadoArticulo : undefined,
        imagenes,
        ubicacion: { campus, zona, referencia: referencia.trim() || undefined, punto },
        contacto: {
          nombre: usuario.nombre,
          carrera: usuario.carrera,
          correo: usuario.correo,
          whatsapp: whatsapp.trim() || undefined,
          instagram: instagram.trim() || undefined,
          preferido,
        },
        autorId: usuario.id,
        diasVigencia: dias,
        lostKind: esForo ? lostKind : undefined,
      })
      avisar('Aviso enviado a revisión', 'ok')
      navegar(`/mis-avisos?nuevo=${creado.id}`)
    } catch {
      avisar('No se pudo publicar. Intenta de nuevo.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="contenedor seccion" style={{ maxWidth: 780 }}>
      <button className="btn btn-fantasma btn-chico" onClick={() => (paso === 0 ? navegar(-1) : setPaso((p) => p - 1))} style={{ marginBottom: 16 }}>
        <Icono nombre="volver" tam={15} /> {paso === 0 ? 'Volver' : `Paso anterior: ${PASOS[paso - 1]}`}
      </button>

      <h1 style={{ marginBottom: 6 }}>Publicar un aviso</h1>
      <p className="tenue" style={{ marginBottom: 24 }}>
        Toma dos minutos. Al enviarlo queda en revisión y, apenas se apruebe, empieza a correr su vigencia de{' '}
        {MAX_DIAS_VIGENCIA} días.
      </p>

      <div className="pasos" style={{ marginBottom: 28 }}>
        {PASOS.map((p, i) => (
          <div key={p} className={`paso${i === paso ? ' activo' : ''}${i < paso ? ' hecho' : ''}`}>
            <span className="paso-num">{i < paso ? <Icono nombre="visto" tam={13} /> : i + 1}</span>
            <span className="paso-lbl">{p}</span>
            {i < PASOS.length - 1 && <span className="paso-linea" />}
          </div>
        ))}
      </div>

      <div className="panel panel-relleno" style={{ padding: 24 }}>
        {/* ── Paso 1: tipo ─────────────────────────────────────────────── */}
        {paso === 0 && (
          <div className="columna" style={{ gap: 20 }}>
            <div className="campo">
              <span className="campo-titulo">¿Qué vas a publicar?</span>
              <div className="opciones opciones-3">
                {(['trabajo', 'venta', 'perdido'] as PostType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="opcion"
                    aria-pressed={type === t}
                    onClick={() => { setType(t); setCategoria('') }}
                  >
                    <span className="opcion-icono"><Icono nombre={t} tam={19} /></span>
                    <span>
                      <span className="opcion-titulo">{TIPOS[t].label}</span>
                      <span className="opcion-texto">{TIPOS[t].descripcion}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {esForo && (
              <div className="campo">
                <span className="campo-titulo">¿Se te perdió o lo encontraste?</span>
                <div className="opciones" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  {(['perdido', 'encontrado'] as LostKind[]).map((k) => (
                    <button key={k} type="button" className="opcion" aria-pressed={lostKind === k} onClick={() => setLostKind(k)}>
                      <span className="opcion-icono"><Icono nombre={k === 'perdido' ? 'buscar' : 'corazon'} tam={19} /></span>
                      <span>
                        <span className="opcion-titulo">{k === 'perdido' ? 'Se me perdió' : 'Lo encontré'}</span>
                        <span className="opcion-texto">
                          {k === 'perdido' ? 'Alguien podría haberlo visto.' : 'Buscas a su dueño.'}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Nota tono="marca" icono="escudo">
              Recuerda: acá <strong>no se cobra ni se paga nada por la plataforma</strong>. Publica solo lo que puedas
              entregar en persona y no pidas transferencias por adelantado.
            </Nota>
          </div>
        )}

        {/* ── Paso 2: detalles ─────────────────────────────────────────── */}
        {paso === 1 && (
          <div className="columna" style={{ gap: 18 }}>
            <div className="campo">
              <label htmlFor="titulo">Título</label>
              <input
                id="titulo"
                className="entrada"
                value={titulo}
                maxLength={90}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={esForo ? 'Perdí mi TNE en el casino el jueves' : 'Calculadora Casio fx-991 como nueva'}
                aria-invalid={Boolean(errores.titulo)}
              />
              <div className="fila-entre">
                {errores.titulo ? <span className="campo-error">{errores.titulo}</span> : <span className="campo-ayuda">Sé concreto: lo que se busca es lo que se encuentra.</span>}
                <span className={`contador-car${titulo.length > 85 ? ' limite' : ''}`}>{titulo.length}/90</span>
              </div>
            </div>

            <div className="campo">
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                className="area"
                value={descripcion}
                maxLength={1500}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={
                  esForo
                    ? 'Cuenta dónde y cuándo fue, cómo es el objeto y cualquier detalle que permita reconocerlo.'
                    : 'Estado real, por qué lo vendes, qué incluye y cuándo puedes entregarlo.'
                }
                aria-invalid={Boolean(errores.descripcion)}
              />
              <div className="fila-entre">
                {errores.descripcion ? <span className="campo-error">{errores.descripcion}</span> : <span className="campo-ayuda">Los avisos con detalle reciben casi el doble de contactos.</span>}
                <span className="contador-car">{descripcion.length}/1500</span>
              </div>
            </div>

            <div className="grupo-campos grupo-2">
              <div className="campo">
                <label htmlFor="categoria">Categoría</label>
                <select id="categoria" className="selector" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-invalid={Boolean(errores.categoria)}>
                  <option value="">Elige una…</option>
                  {CATEGORIAS[type].map((c) => <option key={c}>{c}</option>)}
                </select>
                {errores.categoria && <span className="campo-error">{errores.categoria}</span>}
              </div>

              {type === 'venta' && (
                <div className="campo">
                  <span className="campo-titulo">Estado</span>
                  <div className="fila-envuelve">
                    {(['nuevo', 'como-nuevo', 'usado'] as const).map((e) => (
                      <button key={e} type="button" className="chip" aria-pressed={estadoArticulo === e} onClick={() => setEstadoArticulo(e)}>
                        {e === 'como-nuevo' ? 'Como nuevo' : e[0].toUpperCase() + e.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!esForo && (
              <div className="grupo-campos grupo-2">
                <div className="campo">
                  <label htmlFor="precio">Precio referencial (CLP)</label>
                  <input
                    id="precio"
                    className="entrada"
                    type="number"
                    min={0}
                    step={500}
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="Déjalo vacío si es a convenir"
                  />
                  <span className="campo-ayuda">
                    {precio === '' ? 'Se mostrará como "A convenir".' : `Se verá como ${formatearPrecio(Number(precio))}`}
                  </span>
                </div>
                <div className="campo">
                  <label htmlFor="nota">Nota del precio (opcional)</label>
                  <input id="nota" className="entrada" value={precioNota} onChange={(e) => setPrecioNota(e.target.value)} placeholder="por hora, conversable, por el pack…" />
                </div>
              </div>
            )}

            <div className="campo">
              <span className="campo-titulo">Fotos (opcional, hasta 3)</span>
              {imagenes.length > 0 && (
                <div className="miniaturas" style={{ marginBottom: 10 }}>
                  {imagenes.map((src, i) => (
                    <div className="miniatura" key={i}>
                      <img src={src} alt={`Foto ${i + 1}`} />
                      <button type="button" onClick={() => setImagenes((p) => p.filter((_, j) => j !== i))} aria-label={`Quitar foto ${i + 1}`}>
                        <Icono nombre="cerrar" tam={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {imagenes.length < 3 && (
                <>
                  <button type="button" className="subida" onClick={() => archivoRef.current?.click()}>
                    <Icono nombre="imagen" tam={22} />
                    <span className="chico fuerte">Agregar fotos</span>
                    <span className="mini muy-tenue">Se achican solas antes de guardarse</span>
                  </button>
                  <input ref={archivoRef} type="file" accept="image/*" multiple hidden onChange={(e) => subirFotos(e.target.files)} />
                </>
              )}
              <span className="campo-ayuda">Sin fotos igual se ve bien: generamos una portada con los colores de tu categoría.</span>
            </div>

            {riesgo.riesgo >= 30 && (
              <Nota tono="aviso" icono="alerta">
                <strong>Este aviso va a revisión prioritaria.</strong> Detectamos: {riesgo.banderas.join(', ').toLowerCase()}.
                No es un bloqueo — solo significa que un moderador lo va a mirar con más calma. Si puedes reformularlo,
                se aprueba más rápido.
              </Nota>
            )}
          </div>
        )}

        {/* ── Paso 3: ubicación ────────────────────────────────────────── */}
        {paso === 2 && (
          <div className="columna" style={{ gap: 18 }}>
            <div className="campo">
              <label htmlFor="campus">Campus o sector</label>
              <select
                id="campus"
                className="selector"
                value={campus}
                onChange={(e) => {
                  const nuevo = e.target.value as Campus
                  setCampus(nuevo)
                  setZona('')
                  setPunto(CAMPUS.find((c) => c.id === nuevo)!.punto)
                }}
              >
                {CAMPUS.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>
            </div>

            <div className="campo">
              <span className="campo-titulo">Punto de encuentro sugerido</span>
              <div className="fila-envuelve">
                {zonasCampus.map((z) => (
                  <button key={z} type="button" className="chip" aria-pressed={zona === z} onClick={() => setZona(z)}>
                    <Icono nombre="pin" tam={13} /> {z}
                  </button>
                ))}
              </div>
              {errores.zona && <span className="campo-error">{errores.zona}</span>}
            </div>

            <div className="campo">
              <span className="campo-titulo">Ajusta el punto en el mapa</span>
              <Mapa centro={punto} zoom={16} seleccionable valor={punto} alElegir={setPunto} />
              <span className="campo-ayuda">
                Pincha o arrastra el pin. Marca un lugar público, nunca tu casa: esto lo ve cualquiera.
              </span>
            </div>

            <div className="campo">
              <label htmlFor="ref">Referencia (opcional)</label>
              <input id="ref" className="entrada" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Sala de estudio del segundo piso, al lado de la fotocopiadora…" />
            </div>
          </div>
        )}

        {/* ── Paso 4: contacto ─────────────────────────────────────────── */}
        {paso === 3 && (
          <div className="columna" style={{ gap: 18 }}>
            <Nota icono="info">
              Tu nombre, carrera y correo institucional salen de tu cuenta: <strong>{usuario.nombre}</strong> ·{' '}
              {usuario.correo}
            </Nota>

            <div className="campo">
              <span className="campo-titulo">¿Por dónde prefieres que te escriban?</span>
              <div className="opciones opciones-3">
                {(['whatsapp', 'correo', 'instagram'] as ContactChannel[]).map((c) => (
                  <button key={c} type="button" className="opcion" aria-pressed={preferido === c} onClick={() => setPreferido(c)}>
                    <span className="opcion-icono"><Icono nombre={c === 'correo' ? 'correo' : c} tam={18} /></span>
                    <span className="opcion-titulo" style={{ textTransform: 'capitalize' }}>{c}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grupo-campos grupo-2">
              <div className="campo">
                <label htmlFor="wa">WhatsApp {preferido === 'whatsapp' && <span style={{ color: 'var(--critico-tinta)' }}>*</span>}</label>
                <input id="wa" className="entrada" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+56 9 1234 5678" aria-invalid={Boolean(errores.whatsapp)} />
                {errores.whatsapp && <span className="campo-error">{errores.whatsapp}</span>}
              </div>
              <div className="campo">
                <label htmlFor="ig">Instagram (opcional)</label>
                <input id="ig" className="entrada" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="tu.usuario" />
              </div>
            </div>

            <div className="campo">
              <span className="campo-titulo">¿Cuánto quieres que dure?</span>
              <div className="fila-envuelve">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button key={d} type="button" className="chip" aria-pressed={dias === d} onClick={() => setDias(d)}>
                    {d} {d === 1 ? 'día' : 'días'}
                  </button>
                ))}
              </div>
              <span className="campo-ayuda">
                El máximo son {MAX_DIAS_VIGENCIA} días. Después se despublica solo y puedes renovarlo una vez.
              </span>
            </div>

            {/* Vista previa */}
            <div>
              <div className="mayus tenue" style={{ marginBottom: 8 }}>Así se va a ver</div>
              <div className="tarjeta" style={{ maxWidth: 300, cursor: 'default' }}>
                <div className="tarjeta-portada">
                  {imagenes[0] ? <img src={imagenes[0]} alt="" /> : <PortadaGenerada id="preview" tipo={type} />}
                  <span className="cinta-tipo">
                    <Icono nombre={type} tam={13} style={{ color: TIPOS[type].color }} />
                    {esForo ? (lostKind === 'encontrado' ? 'Encontrado' : 'Perdido') : TIPOS[type].label}
                  </span>
                </div>
                <div className="tarjeta-cuerpo">
                  {!esForo && <span className="tarjeta-precio">{formatearPrecio(precio === '' ? undefined : Number(precio), precioNota)}</span>}
                  <h3 className="tarjeta-titulo recorte-2">{titulo || 'Título de tu aviso'}</h3>
                  <div className="tarjeta-meta">
                    <Icono nombre="pin" tam={13} />
                    <span>{zona || 'Punto por definir'} · {campus.split('—')[0].trim()}</span>
                  </div>
                </div>
              </div>
            </div>

            <label className="interruptor" style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
              <span className="interruptor-pista" style={{ marginTop: 2 }} />
              <span className="chico tenue">
                Confirmo que soy parte de la comunidad UCN, que el aviso es real y que{' '}
                <strong>no voy a pedir pagos por adelantado ni usar la plataforma para cobrar</strong>.
              </span>
            </label>
            {errores.acepta && <span className="campo-error">{errores.acepta}</span>}
          </div>
        )}

        <hr className="separador" style={{ margin: '22px 0 18px' }} />

        <div className="fila-entre">
          <span className="mini muy-tenue">Paso {paso + 1} de {PASOS.length}</span>
          <div className="fila" style={{ gap: 8 }}>
            {paso > 0 && (
              <button className="btn" onClick={() => setPaso((p) => p - 1)}>Atrás</button>
            )}
            {paso < PASOS.length - 1 ? (
              <button className="btn btn-primario" onClick={avanzar}>
                Continuar <Icono nombre="chevron" tam={16} />
              </button>
            ) : (
              <button className="btn btn-primario" onClick={publicar} disabled={enviando}>
                <Icono nombre="enviar" tam={16} /> {enviando ? 'Enviando…' : 'Enviar a revisión'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
