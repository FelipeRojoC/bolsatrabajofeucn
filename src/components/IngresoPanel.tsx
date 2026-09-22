import { useState } from 'react'
import * as api from '../lib/api'
import { Icono } from './Iconos'
import { Nota } from './UI'
import { LogoFeucn } from './Logo'
import { useApp } from '../state/contexto'

/**
 * Formulario de ingreso al panel.
 *
 * No tiene ruta propia ni enlaces desde ningún menú: aparece cuando alguien
 * escribe /adminfeucn a mano. Eso no es una medida de seguridad —una dirección
 * se adivina— pero mantiene el panel fuera de la vista de quien no tiene nada
 * que hacer ahí. Lo que protege de verdad es la contraseña y las políticas de
 * la base.
 */
export const IngresoPanel = () => {
  const { avisar } = useApp()
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEntrando(true)
    setError('')
    try {
      const r = await api.iniciarSesionAdmin(usuario, clave)
      if (r.ok) avisar(`Entraste como ${r.user.nombre}`, 'ok')
      else setError(r.motivo)
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="contenedor seccion" style={{ maxWidth: 420 }}>
      <form className="panel panel-relleno columna" style={{ padding: 28, gap: 18 }} onSubmit={entrar}>
        <div className="centro columna" style={{ gap: 10, alignItems: 'center' }}>
          <LogoFeucn tam={56} />
          <h1 style={{ fontSize: '1.4rem' }}>Panel de administración</h1>
          <p className="chico tenue" style={{ margin: 0 }}>
            Acceso para el equipo de la federación.
          </p>
        </div>

        <div className="campo">
          <label htmlFor="a-usuario">Usuario o correo</label>
          <input
            id="a-usuario"
            className="entrada"
            data-autofoco
            autoComplete="username"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            aria-invalid={Boolean(error)}
          />
        </div>

        <div className="campo">
          <label htmlFor="a-clave">Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="a-clave"
              className="entrada"
              type={verClave ? 'text' : 'password'}
              autoComplete="current-password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              aria-invalid={Boolean(error)}
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
          {error && <span className="campo-error">{error}</span>}
        </div>

        <button className="btn btn-primario btn-grande btn-bloque" type="submit" disabled={entrando || !usuario || !clave}>
          <Icono nombre="candado" tam={17} /> {entrando ? 'Entrando…' : 'Entrar'}
        </button>

        {!api.hayBackendConfigurado() && (
          <Nota tono="aviso" icono="alerta">
            Falta configurar la conexión con la base de datos, así que el ingreso no va a funcionar.
          </Nota>
        )}
      </form>
    </div>
  )
}
