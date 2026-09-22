import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import { CARRERAS, CONDICIONES_FERIA } from '../lib/constants'
import { fechaLarga, formatearNumero, formatearPrecio, porcentaje } from '../lib/format'
import { formatearRut, rutValido } from '../lib/rut'
import type { Feria as TFeria } from '../lib/types'
import { Icono } from '../components/Iconos'
import { Nota, Vacio } from '../components/UI'
import { LogoFeucnGrande } from '../components/Logo'
import { useApp } from '../state/contexto'

export const Feria = () => {
  const { usuario, revision, avisar } = useApp()
  const [enviada, setEnviada] = useState<{ puesto: boolean } | null>(null)

  const feria = useMemo(() => {
    void revision
    return api.feriaVigente()
  }, [revision])

  const postulaciones = useMemo(() => {
    void revision
    return feria ? api.listarPostulaciones(feria.id) : []
  }, [feria, revision])

  if (!feria) {
    return (
      <div className="contenedor seccion">
        <Vacio
          icono="tienda"
          titulo="No hay ferias abiertas por ahora"
          texto="La federación arma ferias de emprendimiento varias veces al año. Cuando se abra la próxima convocatoria, aparece acá y se avisa por las redes de la FEUCN."
          accion={<Link to="/emprendimientos" className="btn btn-primario">Ver el directorio de emprendimientos</Link>}
        />
      </div>
    )
  }

  const ocupados = postulaciones.length
  const restantes = Math.max(0, feria.cupos - ocupados)
  const abierta = feria.estado === 'abierta' && restantes > 0

  return (
    <>
      <section className="heroe">
        <div className="contenedor contenedor-ancho heroe-inner">
          <div className="heroe-rejilla">
            <div className="heroe-texto">
              <span className={`etiqueta ${abierta ? 'etiqueta-ok' : 'etiqueta-aviso'}`} style={{ marginBottom: 16 }}>
                <Icono nombre={abierta ? 'destello' : 'candado'} tam={13} />
                {abierta ? 'Postulaciones abiertas' : 'Convocatoria cerrada'}
              </span>
              <h1>{feria.nombre}</h1>
              <p className="heroe-bajada">{feria.descripcion.split('\n')[0]}</p>

              <div className="heroe-cifras" style={{ marginTop: 26 }}>
                <div className="heroe-cifra">
                  <strong>{fechaLarga(feria.fecha)}</strong>
                  <span>Día del evento</span>
                </div>
                <div className="heroe-cifra">
                  <strong className="numero">{feria.puestos}</strong>
                  <span>mesas disponibles</span>
                </div>
                <div className="heroe-cifra">
                  <strong className="numero">{formatearPrecio(feria.montoInscripcion)}</strong>
                  <span>+ 1 alimento no perecible</span>
                </div>
              </div>
            </div>
            <div className="heroe-marca">
              <LogoFeucnGrande tam={170} />
            </div>
          </div>
        </div>
      </section>

      <div className="contenedor seccion" style={{ maxWidth: 820 }}>
        {/* Cupos */}
        <div className="panel panel-relleno columna" style={{ gap: 10, marginBottom: 26 }}>
          <div className="fila-entre">
            <span className="mayus tenue">Cupos de postulación</span>
            <span className="chico fuerte numero">
              {formatearNumero(ocupados)} de {formatearNumero(feria.cupos)}
            </span>
          </div>
          <div className={`barra-vigencia${restantes <= 5 ? ' urgente' : ''}${restantes === 0 ? ' expirado' : ''}`}>
            <span style={{ width: `${Math.min(100, (ocupados / feria.cupos) * 100)}%` }} />
          </div>
          <span className="mini muy-tenue">
            {restantes > 0
              ? `Quedan ${restantes} cupos. La convocatoria se cierra sola al llegar a ${feria.cupos} postulaciones.`
              : 'El cupo se llenó y la convocatoria se cerró automáticamente.'}
          </span>
        </div>

        <div className="detalle-descripcion" style={{ marginBottom: 26 }}>{feria.descripcion}</div>

        <div className="panel panel-relleno" style={{ marginBottom: 26 }}>
          <div className="mayus tenue" style={{ marginBottom: 8 }}>Datos de la feria</div>
          <div className="dato"><span className="dato-lbl">Fecha</span><span className="dato-val">{fechaLarga(feria.fecha)}</span></div>
          <div className="dato"><span className="dato-lbl">Lugar</span><span className="dato-val">{feria.lugar}</span></div>
          <div className="dato"><span className="dato-lbl">Mesas</span><span className="dato-val numero">{feria.puestos}</span></div>
          <div className="dato">
            <span className="dato-lbl">Aporte</span>
            <span className="dato-val">
              {formatearPrecio(feria.montoInscripcion)}
              {feria.pideAlimento && ' + un alimento no perecible'}
            </span>
          </div>
          <div className="dato">
            <span className="dato-lbl">Asignación</span>
            <span className="dato-val">
              MAPAU toma las primeras mesas; el resto se sortea al azar
            </span>
          </div>
        </div>

        <Nota tono="marca" icono="escudo">
          <strong>El aporte no se paga en este sitio.</strong> Se entrega en la oficina de la federación junto con el
          alimento no perecible, y ahí mismo se marca en la lista de control. La plataforma no procesa pagos.
        </Nota>

        <div style={{ height: 26 }} />

        {enviada ? (
          <div className="panel panel-relleno centro" style={{ padding: 34 }}>
            <Icono nombre="visto" tam={34} style={{ color: 'var(--ok)', margin: '0 auto 12px' }} />
            <h2>Postulación registrada</h2>
            <p className="tenue" style={{ maxWidth: '52ch', margin: '10px auto 0' }}>
              Quedaste en la lista. Cuando la federación termine la selección te llega un correo diciendo si quedaste y
              qué número de mesa te tocó.
            </p>
            {enviada.puesto && (
              <p className="chico" style={{ color: 'var(--aviso-tinta)', marginTop: 12 }}>
                Con tu postulación se completó el cupo, así que la convocatoria quedó cerrada.
              </p>
            )}
          </div>
        ) : abierta ? (
          <FormularioPostulacion
            feria={feria}
            usuario={usuario}
            alEnviar={(seCerro) => {
              setEnviada({ puesto: seCerro })
              avisar('Postulación enviada', 'ok')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            alError={(m) => avisar(m, 'error')}
          />
        ) : (
          <Vacio
            icono="candado"
            titulo="Las postulaciones están cerradas"
            texto="Se llegó al cupo de esta convocatoria. Sigue las redes de la FEUCN para enterarte de la próxima feria."
          />
        )}
      </div>
    </>
  )
}

/* ── Formulario ────────────────────────────────────────────────────────── */

const FormularioPostulacion = ({
  feria,
  usuario,
  alEnviar,
  alError,
}: {
  feria: TFeria
  usuario: ReturnType<typeof useApp>['usuario']
  alEnviar: (seCerro: boolean) => void
  alError: (mensaje: string) => void
}) => {
  const [nombreCompleto, setNombre] = useState(usuario?.nombre ?? '')
  const [correo, setCorreo] = useState(usuario?.correo ?? '')
  const [carrera, setCarrera] = useState(usuario?.carrera ?? '')
  const [rut, setRut] = useState('')
  const [avance, setAvance] = useState('')
  const [emprendimiento, setEmprendimiento] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [esMapau, setEsMapau] = useState(false)
  const [acepta, setAcepta] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)

  const validar = () => {
    const e: Record<string, string> = {}
    if (nombreCompleto.trim().split(/\s+/).length < 2) e.nombre = 'Escribe tu nombre y tus apellidos.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim())) e.correo = 'Revisa el correo.'
    if (!carrera) e.carrera = 'Elige tu carrera.'
    if (!rutValido(rut)) e.rut = 'Ese RUT no es válido. Revisa el dígito verificador.'
    const av = Number(avance)
    if (avance === '' || Number.isNaN(av) || av < 0 || av > 100) e.avance = 'Escribe tu avance entre 0 y 100.'
    if (emprendimiento.trim().length < 2) e.emprendimiento = 'Escribe el nombre de tu emprendimiento.'
    if (descripcion.trim().length < 20) e.descripcion = 'Cuenta en una línea qué vendes (mínimo 20 caracteres).'
    if (!acepta) e.acepta = 'Tienes que aceptar las condiciones para postular.'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const enviar = async () => {
    if (!validar()) return
    setEnviando(true)
    try {
      const r = await api.postularFeria({
        feriaId: feria.id,
        nombreCompleto: nombreCompleto.trim(),
        correo: correo.trim().toLowerCase(),
        carrera,
        rut: formatearRut(rut),
        avanceCurricular: Number(avance),
        nombreEmprendimiento: emprendimiento.trim(),
        descripcionBreve: descripcion.trim(),
        esMapau,
        aceptaCondiciones: true,
      })
      if (r.ok) alEnviar(r.seCerro)
      else alError(r.motivo)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="panel panel-relleno" style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 6 }}>Postular a la feria</h2>
      <p className="tenue chico" style={{ marginBottom: 22 }}>
        Se revisa una postulación por RUT. Todos los campos son obligatorios.
      </p>

      <div className="columna" style={{ gap: 18 }}>
        <div className="grupo-campos grupo-2">
          <div className="campo">
            <label htmlFor="fnombre">Nombre completo</label>
            <input id="fnombre" className="entrada" value={nombreCompleto} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellidos" aria-invalid={Boolean(errores.nombre)} />
            {errores.nombre && <span className="campo-error">{errores.nombre}</span>}
          </div>
          <div className="campo">
            <label htmlFor="fcorreo">Correo</label>
            <input id="fcorreo" className="entrada" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tu.nombre@alumnos.ucn.cl" aria-invalid={Boolean(errores.correo)} />
            {errores.correo ? <span className="campo-error">{errores.correo}</span> : <span className="campo-ayuda">Acá te llega el resultado de la selección.</span>}
          </div>
        </div>

        <div className="grupo-campos grupo-2">
          <div className="campo">
            <label htmlFor="fcarrera">Carrera</label>
            <select id="fcarrera" className="selector" value={carrera} onChange={(e) => setCarrera(e.target.value)} aria-invalid={Boolean(errores.carrera)}>
              <option value="">Elige tu carrera…</option>
              {CARRERAS.map((c) => <option key={c}>{c}</option>)}
            </select>
            {errores.carrera && <span className="campo-error">{errores.carrera}</span>}
          </div>
          <div className="campo">
            <label htmlFor="frut">RUT</label>
            <input
              id="frut"
              className="entrada"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              onBlur={() => rut && setRut(formatearRut(rut))}
              placeholder="12.345.678-9"
              inputMode="text"
              aria-invalid={Boolean(errores.rut)}
            />
            {errores.rut ? <span className="campo-error">{errores.rut}</span> : <span className="campo-ayuda">Se usa para el control de entrada el día de la feria.</span>}
          </div>
        </div>

        <div className="grupo-campos grupo-2">
          <div className="campo">
            <label htmlFor="favance">Avance curricular (%)</label>
            <input id="favance" className="entrada" type="number" min={0} max={100} value={avance} onChange={(e) => setAvance(e.target.value)} placeholder="65" aria-invalid={Boolean(errores.avance)} />
            {errores.avance ? <span className="campo-error">{errores.avance}</span> : <span className="campo-ayuda">El que aparece en tu portal académico.</span>}
          </div>
          <div className="campo">
            <label htmlFor="femp">Nombre del emprendimiento</label>
            <input id="femp" className="entrada" value={emprendimiento} onChange={(e) => setEmprendimiento(e.target.value)} placeholder="Dulce Norte" aria-invalid={Boolean(errores.emprendimiento)} />
            {errores.emprendimiento && <span className="campo-error">{errores.emprendimiento}</span>}
          </div>
        </div>

        <div className="campo">
          <label htmlFor="fdesc">¿Qué vendes?</label>
          <textarea id="fdesc" className="area" style={{ minHeight: 90 }} value={descripcion} maxLength={400} onChange={(e) => setDescripcion(e.target.value)} placeholder="Tortas, brownies y kuchen por encargo, con opciones sin azúcar." aria-invalid={Boolean(errores.descripcion)} />
          <div className="fila-entre">
            {errores.descripcion ? <span className="campo-error">{errores.descripcion}</span> : <span className="campo-ayuda">Una o dos líneas bastan.</span>}
            <span className="contador-car">{descripcion.length}/400</span>
          </div>
        </div>

        <label className="interruptor" style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={esMapau} onChange={(e) => setEsMapau(e.target.checked)} />
          <span className="interruptor-pista" style={{ marginTop: 2 }} />
          <span className="chico tenue">
            Mi emprendimiento pertenece a <strong>MAPAU</strong>.
            <span style={{ display: 'block' }} className="mini muy-tenue">
              Los emprendimientos MAPAU toman las primeras mesas; las demás se sortean entre el resto.
            </span>
          </span>
        </label>

        <div className="panel panel-relleno panel-plano" style={{ background: 'var(--plano)' }}>
          <div className="mayus tenue" style={{ marginBottom: 8 }}>Condiciones</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            {CONDICIONES_FERIA.map((c) => (
              <li key={c} className="chico tenue">{c}</li>
            ))}
          </ul>
        </div>

        <label className="interruptor" style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
          <span className="interruptor-pista" style={{ marginTop: 2 }} />
          <span className="chico">
            Leí y acepto todas las condiciones, y confirmo que los datos que entregué son verdaderos.
          </span>
        </label>
        {errores.acepta && <span className="campo-error">{errores.acepta}</span>}

        <button className="btn btn-primario btn-grande btn-bloque" onClick={enviar} disabled={enviando}>
          <Icono nombre="enviar" tam={18} /> {enviando ? 'Enviando…' : 'Enviar postulación'}
        </button>
        <span className="mini muy-tenue centro">
          Postular no garantiza el cupo: se seleccionan {feria.puestos} de las {feria.cupos} postulaciones{' '}
          ({porcentaje(feria.puestos, feria.cupos, 0)}).
        </span>
      </div>
    </div>
  )
}
