import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api'
import { CARRERAS } from '../lib/constants'
import { Icono } from '../components/Iconos'
import { Nota } from '../components/UI'
import { LogoFeucn } from '../components/Logo'
import { useApp } from '../state/contexto'

/**
 * Ingreso y registro de estudiantes.
 *
 * Es una máquina de pasos: del formulario se pasa a pedir el código que llegó
 * al correo, y desde "olvidé mi contraseña" se entra al mismo lugar pero para
 * dejar una contraseña nueva.
 */
type Paso = 'entrar' | 'crear' | 'codigo-cuenta' | 'pedir-recuperacion' | 'codigo-recuperacion'

const LARGO_CODIGO = 6

export const Entrar = () => {
  const { usuario, avisar, conBackend } = useApp()
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const [paso, setPaso] = useState<Paso>(params.get('crear') ? 'crear' : 'entrar')

  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [carrera, setCarrera] = useState('')
  const [clave, setClave] = useState('')
  const [codigo, setCodigo] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [esperaReenvio, setEsperaReenvio] = useState(0)

  const volverA = params.get('volver') ?? '/'
  const enCodigo = paso === 'codigo-cuenta' || paso === 'codigo-recuperacion'

  // Cuenta atrás para no dejar que se pidan códigos en ráfaga.
  useEffect(() => {
    if (esperaReenvio <= 0) return
    const t = setInterval(() => setEsperaReenvio((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [esperaReenvio])

  const irA = (siguiente: Paso) => {
    setPaso(siguiente)
    setErrores({})
  }

  if (usuario) {
    return (
      <div className="contenedor seccion" style={{ maxWidth: 460 }}>
        <div className="panel panel-relleno centro" style={{ padding: 32 }}>
          <Icono nombre="visto" tam={30} style={{ color: 'var(--ok)', margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: '1.3rem' }}>Ya iniciaste sesión</h1>
          <p className="tenue" style={{ margin: '10px 0 20px' }}>
            Estás dentro como <strong>{usuario.nombre}</strong>.
          </p>
          <div className="fila" style={{ justifyContent: 'center', gap: 8 }}>
            <Link to="/publicar" className="btn btn-primario"><Icono nombre="mas" tam={16} /> Publicar un aviso</Link>
            <Link to="/mis-avisos" className="btn">Mis avisos</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!conBackend) {
    return (
      <div className="contenedor seccion" style={{ maxWidth: 460 }}>
        <Nota tono="aviso" icono="alerta">
          La aplicación está corriendo sin base de datos, así que no se pueden crear cuentas. Usa el menú de arriba a
          la derecha para entrar con una cuenta de demostración.
        </Nota>
      </div>
    )
  }

  /* ── Acciones ──────────────────────────────────────────────────────── */

  const validarFormulario = () => {
    const e: Record<string, string> = {}
    if (!api.correoInstitucional(correo)) {
      e.correo = `Tiene que ser tu correo UCN: ${api.DOMINIOS_UCN.map((d) => `@${d}`).join(', ')}`
    }
    if (paso === 'crear') {
      if (nombre.trim().split(/\s+/).length < 2) e.nombre = 'Escribe tu nombre y tus apellidos.'
      if (!carrera) e.carrera = 'Elige tu carrera.'
      if (clave.length < 8) e.clave = 'Al menos 8 caracteres.'
    } else if (!clave) {
      e.clave = 'Escribe tu contraseña.'
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setEnviando(true)
    setErrores({})
    try {
      /* Crear cuenta ------------------------------------------------- */
      if (paso === 'crear') {
        if (!validarFormulario()) return
        const r = await api.registrarEstudiante({ nombre, correo, carrera, clave })
        if (!r.ok) return setErrores({ general: r.motivo })
        if (r.necesitaConfirmar) {
          setEsperaReenvio(45)
          avisar('Te mandamos un código al correo', 'ok')
          return irA('codigo-cuenta')
        }
        avisar(`¡Bienvenido, ${r.user?.nombre.split(' ')[0] ?? ''}!`, 'ok')
        return navegar(volverA)
      }

      /* Entrar -------------------------------------------------------- */
      if (paso === 'entrar') {
        if (!validarFormulario()) return
        const r = await api.iniciarSesionEstudiante(correo, clave)
        if (!r.ok) {
          // Si falta confirmar, se va directo al paso del código.
          if (r.motivo.includes('confirmas')) {
            await api.reenviarCodigoCuenta(correo)
            setEsperaReenvio(45)
            return irA('codigo-cuenta')
          }
          return setErrores({ general: r.motivo })
        }
        avisar(`Hola de nuevo, ${r.user.nombre.split(' ')[0]}`, 'ok')
        return navegar(r.user.role === 'estudiante' ? volverA : '/adminfeucn')
      }

      /* Confirmar la cuenta con el código ----------------------------- */
      if (paso === 'codigo-cuenta') {
        if (codigo.length !== LARGO_CODIGO) return setErrores({ codigo: `El código tiene ${LARGO_CODIGO} dígitos.` })
        const r = await api.confirmarCuenta(correo, codigo)
        if (!r.ok) return setErrores({ codigo: r.motivo })
        avisar('Cuenta confirmada. ¡Bienvenido!', 'ok')
        return navegar(volverA)
      }

      /* Pedir el código de recuperación ------------------------------- */
      if (paso === 'pedir-recuperacion') {
        const r = await api.pedirCodigoRecuperacion(correo)
        if (!r.ok) return setErrores({ correo: r.motivo })
        setCodigo('')
        setClave('')
        setEsperaReenvio(45)
        avisar('Te mandamos un código al correo', 'ok')
        return irA('codigo-recuperacion')
      }

      /* Cambiar la contraseña con el código --------------------------- */
      if (paso === 'codigo-recuperacion') {
        const e: Record<string, string> = {}
        if (codigo.length !== LARGO_CODIGO) e.codigo = `El código tiene ${LARGO_CODIGO} dígitos.`
        if (clave.length < 8) e.clave = 'Al menos 8 caracteres.'
        if (Object.keys(e).length) return setErrores(e)

        const r = await api.cambiarClaveConCodigo(correo, codigo, clave)
        if (!r.ok) return setErrores({ general: r.motivo })
        avisar('Contraseña cambiada. Ya estás dentro.', 'ok')
        return navegar(volverA)
      }
    } finally {
      setEnviando(false)
    }
  }

  const reenviar = async () => {
    if (esperaReenvio > 0) return
    const r =
      paso === 'codigo-cuenta'
        ? await api.reenviarCodigoCuenta(correo)
        : await api.pedirCodigoRecuperacion(correo)
    if (r.ok) {
      setEsperaReenvio(45)
      avisar('Código reenviado', 'ok')
    } else {
      avisar(r.motivo, 'error')
    }
  }

  /* ── Pantalla del código ───────────────────────────────────────────── */

  if (enCodigo) {
    const recuperando = paso === 'codigo-recuperacion'
    return (
      <div className="contenedor seccion" style={{ maxWidth: 460 }}>
        <form className="panel panel-relleno columna" style={{ padding: 28, gap: 18 }} onSubmit={enviar}>
          <div className="centro columna" style={{ gap: 10, alignItems: 'center' }}>
            <LogoFeucn tam={54} />
            <h1 style={{ fontSize: '1.35rem' }}>Revisa tu correo</h1>
            <p className="chico tenue" style={{ margin: 0 }}>
              Mandamos un código de {LARGO_CODIGO} dígitos a <strong>{correo}</strong>.
            </p>
          </div>

          {errores.general && <Nota tono="critico" icono="alerta">{errores.general}</Nota>}

          <CampoCodigo
            valor={codigo}
            alCambiar={setCodigo}
            error={errores.codigo}
            autoCompletar={!recuperando}
          />

          {recuperando && (
            <div className="campo">
              <label htmlFor="r-clave">Contraseña nueva</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="r-clave"
                  className="entrada"
                  type={verClave ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={clave}
                  onChange={(ev) => setClave(ev.target.value)}
                  aria-invalid={Boolean(errores.clave)}
                  style={{ paddingRight: 46 }}
                />
                <button
                  type="button"
                  className="btn btn-fantasma btn-icono btn-chico"
                  style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => setVerClave((v) => !v)}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Icono nombre="ojo" tam={16} />
                </button>
              </div>
              {errores.clave ? (
                <span className="campo-error">{errores.clave}</span>
              ) : (
                <span className="campo-ayuda">Mínimo 8 caracteres, distinta de la anterior.</span>
              )}
            </div>
          )}

          <button className="btn btn-primario btn-grande btn-bloque" type="submit" disabled={enviando}>
            <Icono nombre="visto" tam={17} />
            {enviando ? 'Un momento…' : recuperando ? 'Cambiar contraseña' : 'Confirmar cuenta'}
          </button>

          <div className="fila-entre">
            <button type="button" className="btn btn-fantasma btn-chico" onClick={() => irA(recuperando ? 'entrar' : 'crear')}>
              <Icono nombre="volver" tam={14} /> Atrás
            </button>
            <button type="button" className="btn btn-fantasma btn-chico" onClick={reenviar} disabled={esperaReenvio > 0}>
              {esperaReenvio > 0 ? `Reenviar en ${esperaReenvio}s` : 'Reenviar código'}
            </button>
          </div>

          <p className="mini muy-tenue centro" style={{ margin: 0 }}>
            El código vence en una hora. Si no llega, mira en la carpeta de no deseados.
          </p>
        </form>
      </div>
    )
  }

  /* ── Pedir el correo para recuperar ────────────────────────────────── */

  if (paso === 'pedir-recuperacion') {
    return (
      <div className="contenedor seccion" style={{ maxWidth: 460 }}>
        <form className="panel panel-relleno columna" style={{ padding: 28, gap: 18 }} onSubmit={enviar}>
          <div className="centro columna" style={{ gap: 10, alignItems: 'center' }}>
            <LogoFeucn tam={54} />
            <h1 style={{ fontSize: '1.35rem' }}>Recuperar tu cuenta</h1>
            <p className="chico tenue" style={{ margin: 0 }}>
              Te mandamos un código para dejar una contraseña nueva.
            </p>
          </div>

          <div className="campo">
            <label htmlFor="r-correo">Correo institucional</label>
            <input
              id="r-correo"
              className="entrada"
              type="email"
              autoComplete="email"
              data-autofoco
              value={correo}
              onChange={(ev) => setCorreo(ev.target.value)}
              placeholder="tu.nombre@alumnos.ucn.cl"
              aria-invalid={Boolean(errores.correo)}
            />
            {errores.correo && <span className="campo-error">{errores.correo}</span>}
          </div>

          <button className="btn btn-primario btn-grande btn-bloque" type="submit" disabled={enviando}>
            <Icono nombre="correo" tam={17} /> {enviando ? 'Enviando…' : 'Mandarme el código'}
          </button>
          <button type="button" className="btn btn-fantasma btn-chico" onClick={() => irA('entrar')}>
            <Icono nombre="volver" tam={14} /> Volver al ingreso
          </button>
        </form>
      </div>
    )
  }

  /* ── Formulario principal ──────────────────────────────────────────── */

  return (
    <div className="contenedor seccion" style={{ maxWidth: 460 }}>
      <form className="panel panel-relleno columna" style={{ padding: 28, gap: 18 }} onSubmit={enviar}>
        <div className="centro columna" style={{ gap: 10, alignItems: 'center' }}>
          <LogoFeucn tam={54} />
          <h1 style={{ fontSize: '1.35rem' }}>
            {paso === 'crear' ? 'Crear tu cuenta' : 'Entrar a la bolsa'}
          </h1>
          <p className="chico tenue" style={{ margin: 0 }}>
            {paso === 'crear'
              ? 'Con tu correo institucional UCN.'
              : 'Para publicar avisos y seguir tus estadísticas.'}
          </p>
        </div>

        <div className="pestanas" role="tablist">
          <button
            type="button"
            className="pestana"
            role="tab"
            aria-selected={paso === 'entrar'}
            onClick={() => irA('entrar')}
            style={{ flex: 1 }}
          >
            Ya tengo cuenta
          </button>
          <button
            type="button"
            className="pestana"
            role="tab"
            aria-selected={paso === 'crear'}
            onClick={() => irA('crear')}
            style={{ flex: 1 }}
          >
            Crear cuenta
          </button>
        </div>

        {errores.general && <Nota tono="critico" icono="alerta">{errores.general}</Nota>}

        {paso === 'crear' && (
          <div className="campo">
            <label htmlFor="e-nombre">Nombre completo</label>
            <input
              id="e-nombre"
              className="entrada"
              autoComplete="name"
              value={nombre}
              onChange={(ev) => setNombre(ev.target.value)}
              placeholder="Nombre y apellidos"
              aria-invalid={Boolean(errores.nombre)}
            />
            {errores.nombre && <span className="campo-error">{errores.nombre}</span>}
          </div>
        )}

        <div className="campo">
          <label htmlFor="e-correo">Correo institucional</label>
          <input
            id="e-correo"
            className="entrada"
            type="email"
            autoComplete="email"
            data-autofoco
            value={correo}
            onChange={(ev) => setCorreo(ev.target.value)}
            placeholder="tu.nombre@alumnos.ucn.cl"
            aria-invalid={Boolean(errores.correo)}
          />
          {errores.correo && <span className="campo-error">{errores.correo}</span>}
        </div>

        {paso === 'crear' && (
          <div className="campo">
            <label htmlFor="e-carrera">Carrera</label>
            <select
              id="e-carrera"
              className="selector"
              value={carrera}
              onChange={(ev) => setCarrera(ev.target.value)}
              aria-invalid={Boolean(errores.carrera)}
            >
              <option value="">Elige tu carrera…</option>
              {CARRERAS.map((c) => <option key={c}>{c}</option>)}
            </select>
            {errores.carrera && <span className="campo-error">{errores.carrera}</span>}
          </div>
        )}

        <div className="campo">
          <label htmlFor="e-clave">Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="e-clave"
              className="entrada"
              type={verClave ? 'text' : 'password'}
              autoComplete={paso === 'crear' ? 'new-password' : 'current-password'}
              value={clave}
              onChange={(ev) => setClave(ev.target.value)}
              aria-invalid={Boolean(errores.clave)}
              style={{ paddingRight: 46 }}
            />
            <button
              type="button"
              className="btn btn-fantasma btn-icono btn-chico"
              style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)' }}
              onClick={() => setVerClave((v) => !v)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <Icono nombre="ojo" tam={16} />
            </button>
          </div>
          {errores.clave ? (
            <span className="campo-error">{errores.clave}</span>
          ) : paso === 'crear' ? (
            <span className="campo-ayuda">Mínimo 8 caracteres. Usa una que no ocupes en otra parte.</span>
          ) : null}
        </div>

        <button className="btn btn-primario btn-grande btn-bloque" type="submit" disabled={enviando}>
          <Icono nombre={paso === 'crear' ? 'mas' : 'candado'} tam={17} />
          {enviando ? 'Un momento…' : paso === 'crear' ? 'Crear cuenta' : 'Entrar'}
        </button>

        {paso === 'entrar' && (
          <button type="button" className="btn btn-fantasma btn-chico" onClick={() => irA('pedir-recuperacion')}>
            Olvidé mi contraseña
          </button>
        )}

        <p className="mini muy-tenue centro" style={{ margin: 0 }}>
          {paso === 'crear'
            ? 'Te mandaremos un código al correo para confirmar que la cuenta es tuya.'
            : 'Solo la comunidad UCN puede publicar. Tu correo no se muestra en los avisos hasta que alguien pulsa "Ver contacto".'}
        </p>
      </form>
    </div>
  )
}

/* ── Campo de código ───────────────────────────────────────────────────── */

const CampoCodigo = ({
  valor,
  alCambiar,
  error,
  autoCompletar,
}: {
  valor: string
  alCambiar: (v: string) => void
  error?: string
  /** Al completar los seis dígitos, envía el formulario sin tocar el botón. */
  autoCompletar?: boolean
}) => {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <div className="campo">
      <label htmlFor="codigo">Código de {LARGO_CODIGO} dígitos</label>
      <input
        ref={ref}
        id="codigo"
        className="entrada entrada-codigo"
        // Con esto el teclado del teléfono abre en números y iOS ofrece
        // pegar el código apenas llega el correo.
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={LARGO_CODIGO}
        value={valor}
        onChange={(e) => {
          const limpio = e.target.value.replace(/\D/g, '').slice(0, LARGO_CODIGO)
          alCambiar(limpio)
          if (limpio.length === LARGO_CODIGO && autoCompletar) {
            const form = e.currentTarget.form
            setTimeout(() => form?.requestSubmit(), 80)
          }
        }}
        aria-invalid={Boolean(error)}
        placeholder="000000"
      />
      {error && <span className="campo-error">{error}</span>}
    </div>
  )
}
