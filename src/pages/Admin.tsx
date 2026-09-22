import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import * as api from '../lib/api'
import { Icono } from '../components/Iconos'
import { Nota } from '../components/UI'
import { LogoFeucn } from '../components/Logo'
import { hayBackend } from '../lib/supabase'
import { useApp } from '../state/contexto'

/**
 * Ingreso al panel. Las cuentas no se crean desde acá a propósito: las da de
 * alta la federación en el backend.
 */
export const Admin = () => {
  const { esModerador, avisar } = useApp()
  const navegar = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  if (esModerador) return <Navigate to="/moderacion" replace />

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEntrando(true)
    setError('')
    try {
      const r = await api.iniciarSesionAdmin(usuario, clave)
      if (r.ok) {
        avisar(`Entraste como ${r.user.nombre}`, 'ok')
        navegar('/moderacion')
      } else {
        setError(r.motivo)
      }
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
          {hayBackend() && <span className="campo-ayuda">La cuenta que creó la federación en Supabase.</span>}
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

        <Nota icono="info">
          Las cuentas se crean solo desde el backend. Si necesitas acceso, pídeselo a la mesa directiva.
        </Nota>
      </form>
    </div>
  )
}
