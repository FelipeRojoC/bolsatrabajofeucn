import { useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api'
import { fechaLarga, hace, normalizar } from '../lib/format'
import type { ContenidoBorrado, CuentaPanel } from '../lib/types'
import { Icono } from './Iconos'
import { Avatar, Modal, Nota, Vacio } from './UI'
import { Cifra } from './Graficos'
import { useApp } from '../state/contexto'

type Filtro = 'todas' | 'activas' | 'suspendidas' | 'equipo'

/** Acción destructiva pendiente de confirmar. */
interface Pendiente {
  cuenta: CuentaPanel
  accion: 'suspender' | 'eliminar'
}

export const PanelCuentas = () => {
  const { usuario, revision, avisar } = useApp()
  const [cuentas, setCuentas] = useState<CuentaPanel[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)

  const recargar = async () => {
    setCargando(true)
    try {
      setCuentas(await api.listarCuentas())
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void recargar()
    // El panel se recarga con cada cambio en la base para no quedar desfasado.
  }, [revision])

  const visibles = useMemo(() => {
    const q = normalizar(busqueda).trim()
    return cuentas.filter((c) => {
      if (filtro === 'activas' && c.suspendido) return false
      if (filtro === 'suspendidas' && !c.suspendido) return false
      if (filtro === 'equipo' && c.role === 'estudiante') return false
      if (!q) return true
      return normalizar(`${c.nombre} ${c.correo} ${c.carrera}`).includes(q)
    })
  }, [cuentas, busqueda, filtro])

  const conteos = useMemo(
    () => ({
      todas: cuentas.length,
      activas: cuentas.filter((c) => !c.suspendido).length,
      suspendidas: cuentas.filter((c) => c.suspendido).length,
      equipo: cuentas.filter((c) => c.role !== 'estudiante').length,
    }),
    [cuentas],
  )

  const resumen = (b: ContenidoBorrado) => {
    const partes = [
      b.avisos && `${b.avisos} ${b.avisos === 1 ? 'aviso' : 'avisos'}`,
      b.respuestas && `${b.respuestas} ${b.respuestas === 1 ? 'respuesta' : 'respuestas'}`,
      b.emprendimientos && `${b.emprendimientos} ${b.emprendimientos === 1 ? 'emprendimiento' : 'emprendimientos'}`,
      b.postulaciones && `${b.postulaciones} ${b.postulaciones === 1 ? 'postulación' : 'postulaciones'}`,
    ].filter(Boolean)
    return partes.length ? `Se retiró: ${partes.join(', ')}.` : 'No tenía contenido publicado.'
  }

  const confirmar = async (motivo: string) => {
    if (!pendiente) return
    const { cuenta, accion } = pendiente
    const r =
      accion === 'suspender'
        ? await api.suspenderCuenta(cuenta.id, motivo)
        : await api.eliminarCuenta(cuenta.id)

    if (!r.ok) {
      avisar(r.motivo, 'error')
    } else {
      avisar(
        `${accion === 'suspender' ? 'Cuenta suspendida' : 'Cuenta eliminada'}. ${resumen(r.borrado)}`,
        'ok',
      )
      await recargar()
    }
    setPendiente(null)
  }

  const reactivar = async (c: CuentaPanel) => {
    const r = await api.reactivarCuenta(c.id)
    avisar(r.ok ? `${c.nombre} puede volver a entrar` : r.motivo, r.ok ? 'ok' : 'error')
    if (r.ok) await recargar()
  }

  if (cargando && !cuentas.length) {
    return (
      <div className="columna" style={{ gap: 10 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="esqueleto" style={{ height: 64, borderRadius: 'var(--r-md)' }} />
        ))}
      </div>
    )
  }

  const FILTROS: { id: Filtro; texto: string }[] = [
    { id: 'todas', texto: 'Todas' },
    { id: 'activas', texto: 'Activas' },
    { id: 'suspendidas', texto: 'Suspendidas' },
    { id: 'equipo', texto: 'Equipo' },
  ]

  return (
    <>
      <div className="grilla-cifras" style={{ marginBottom: 20 }}>
        <Cifra etiqueta="Cuentas registradas" valor={String(conteos.todas)} pie="Con correo institucional UCN" />
        <Cifra etiqueta="Activas" valor={String(conteos.activas)} pie="Pueden publicar" />
        <Cifra etiqueta="Suspendidas" valor={String(conteos.suspendidas)} subirEsBueno={false} pie="Sin acceso al sitio" />
        <Cifra etiqueta="Equipo" valor={String(conteos.equipo)} pie="Moderación y administración" />
      </div>

      <div className="fila-envuelve" style={{ gap: 10, marginBottom: 16 }}>
        <div className="buscador crecer" style={{ minWidth: 230 }}>
          <Icono nombre="buscar" tam={17} />
          <input
            className="entrada"
            placeholder="Buscar por nombre, correo o carrera…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar cuentas"
          />
          {busqueda && (
            <button className="btn btn-fantasma btn-icono btn-chico limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar">
              <Icono nombre="cerrar" tam={15} />
            </button>
          )}
        </div>
        <button className="btn btn-chico" onClick={recargar}>
          <Icono nombre="refrescar" tam={15} /> Actualizar
        </button>
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
        <Vacio
          icono="usuarios"
          titulo={busqueda ? 'Nadie coincide con esa búsqueda' : 'No hay cuentas en esta lista'}
          texto={busqueda ? 'Prueba con parte del nombre o del correo.' : undefined}
        />
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Persona</th>
                <th scope="col">Carrera</th>
                <th scope="col" className="num">Publicado</th>
                <th scope="col">Registro</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="solo-lectores">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => {
                const esYo = c.id === usuario?.id
                const esAdminCuenta = c.role === 'admin'
                return (
                  <tr key={c.id} style={c.suspendido ? { opacity: 0.68 } : undefined}>
                    <th scope="row" style={{ maxWidth: 260 }}>
                      <div className="fila" style={{ gap: 9 }}>
                        <Avatar nombre={c.nombre} color={c.avatar} tam="sm" />
                        <div style={{ minWidth: 0 }}>
                          <span className="recorte-2">{c.nombre}</span>
                          <span className="mini muy-tenue" style={{ display: 'block', fontWeight: 400 }}>
                            {c.correo}
                          </span>
                        </div>
                      </div>
                    </th>
                    <td className="chico tenue">{c.carrera}</td>
                    <td className="num">
                      <span title={`${c.avisos} avisos, ${c.respuestas} respuestas, ${c.emprendimientos} emprendimientos`}>
                        {c.avisos + c.respuestas + c.emprendimientos}
                      </span>
                      {c.avisosActivos > 0 && (
                        <span className="mini muy-tenue" style={{ display: 'block' }}>
                          {c.avisosActivos} activo{c.avisosActivos === 1 ? '' : 's'}
                        </span>
                      )}
                    </td>
                    <td className="chico tenue">
                      {c.creadoEn ? hace(c.creadoEn) : '—'}
                      <span className="mini muy-tenue" style={{ display: 'block' }}>
                        {c.ultimoIngreso ? `Entró ${hace(c.ultimoIngreso)}` : 'Nunca ha entrado'}
                      </span>
                    </td>
                    <td>
                      <div className="columna" style={{ gap: 4, alignItems: 'flex-start' }}>
                        {c.suspendido ? (
                          <span className="etiqueta etiqueta-critico">
                            <Icono nombre="candado" tam={11} /> Suspendida
                          </span>
                        ) : (
                          <span className="etiqueta etiqueta-ok">Activa</span>
                        )}
                        {esAdminCuenta && <span className="etiqueta etiqueta-marca">Admin</span>}
                        {c.role === 'moderador' && <span className="etiqueta etiqueta-contorno">Moderación</span>}
                        {!c.correoConfirmado && (
                          <span className="etiqueta etiqueta-aviso">Sin confirmar</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {esYo || esAdminCuenta ? (
                        <span className="mini muy-tenue">{esYo ? 'Tu cuenta' : 'Protegida'}</span>
                      ) : (
                        <div className="fila" style={{ gap: 5 }}>
                          {c.suspendido ? (
                            <button className="btn btn-ok btn-chico" onClick={() => reactivar(c)}>
                              <Icono nombre="refrescar" tam={14} /> Reactivar
                            </button>
                          ) : (
                            <button
                              className="btn btn-chico"
                              onClick={() => setPendiente({ cuenta: c, accion: 'suspender' })}
                            >
                              <Icono nombre="candado" tam={14} /> Suspender
                            </button>
                          )}
                          <button
                            className="btn btn-peligro btn-chico btn-icono"
                            onClick={() => setPendiente({ cuenta: c, accion: 'eliminar' })}
                            aria-label={`Eliminar la cuenta de ${c.nombre}`}
                            title="Eliminar"
                          >
                            <Icono nombre="basura" tam={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mini muy-tenue" style={{ marginTop: 12 }}>
        Suspender y eliminar retiran del sitio todo lo que esa persona publicó: avisos, respuestas del foro,
        emprendimientos y postulaciones a ferias. Las cuentas de administración no se pueden tocar desde acá.
      </p>

      {/* La `key` remonta el diálogo por cada cuenta: así los campos parten
          limpios sin necesidad de un efecto que los reinicie. */}
      {pendiente && (
        <ConfirmarAccion
          key={`${pendiente.cuenta.id}-${pendiente.accion}`}
          pendiente={pendiente}
          alCancelar={() => setPendiente(null)}
          alConfirmar={confirmar}
        />
      )}
    </>
  )
}

/* ── Confirmación ──────────────────────────────────────────────────────── */

const MOTIVOS = [
  'Publicaciones que no corresponden a la comunidad UCN',
  'Intento de estafa',
  'Contenido ofensivo o discriminatorio',
  'Venta de productos prohibidos',
  'Reincidencia tras avisos de moderación',
  'A solicitud de la propia persona',
]

const ConfirmarAccion = ({
  pendiente,
  alCancelar,
  alConfirmar,
}: {
  pendiente: Pendiente
  alCancelar: () => void
  alConfirmar: (motivo: string) => void
}) => {
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [texto, setTexto] = useState('')
  const [trabajando, setTrabajando] = useState(false)

  const { cuenta, accion } = pendiente
  const eliminando = accion === 'eliminar'
  // Escribir ELIMINAR evita el borrado por inercia, que no se puede deshacer.
  const puedeSeguir = !eliminando || texto.trim().toUpperCase() === 'ELIMINAR'
  const total = cuenta.avisos + cuenta.respuestas + cuenta.emprendimientos

  return (
    <Modal
      abierto
      alCerrar={alCancelar}
      titulo={eliminando ? 'Eliminar la cuenta' : 'Suspender la cuenta'}
      subtitulo={`${cuenta.nombre} · ${cuenta.correo}`}
      pie={
        <>
          <button className="btn btn-fantasma" onClick={alCancelar}>Cancelar</button>
          <button
            className="btn btn-peligro"
            disabled={!puedeSeguir || trabajando}
            onClick={() => {
              setTrabajando(true)
              alConfirmar(motivo)
            }}
          >
            <Icono nombre={eliminando ? 'basura' : 'candado'} tam={16} />
            {trabajando ? 'Aplicando…' : eliminando ? 'Eliminar definitivamente' : 'Suspender'}
          </button>
        </>
      }
    >
      <div className="columna" style={{ gap: 16 }}>
        <Nota tono="critico" icono="alerta">
          <strong>Se va a borrar todo lo que publicó</strong>
          {total > 0 ? (
            <>
              : {cuenta.avisos} {cuenta.avisos === 1 ? 'aviso' : 'avisos'}, {cuenta.respuestas}{' '}
              {cuenta.respuestas === 1 ? 'respuesta' : 'respuestas'} del foro y {cuenta.emprendimientos}{' '}
              {cuenta.emprendimientos === 1 ? 'emprendimiento' : 'emprendimientos'}, más sus postulaciones a ferias.
            </>
          ) : (
            ', aunque ahora mismo no tiene nada publicado.'
          )}{' '}
          Esto no se puede deshacer, ni siquiera reactivando la cuenta después.
        </Nota>

        {eliminando ? (
          <Nota tono="aviso" icono="info">
            Al eliminar, el correo <strong>{cuenta.correo}</strong> queda libre y esa persona puede volver a
            registrarse. Si lo que quieres es que no vuelva a entrar, usa <strong>suspender</strong>.
          </Nota>
        ) : (
          <Nota icono="info">
            La cuenta queda registrada pero sin acceso, así que no puede volver a entrar ni crear otra con el mismo
            correo. Se puede reactivar después, pero el contenido borrado no vuelve.
          </Nota>
        )}

        {!eliminando && (
          <div className="campo">
            <label htmlFor="motivo-susp">Motivo</label>
            <select id="motivo-susp" className="selector" data-autofoco value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <span className="campo-ayuda">Queda guardado junto a la cuenta, para saber después por qué se hizo.</span>
          </div>
        )}

        {eliminando && (
          <div className="campo">
            <label htmlFor="confirmar-texto">
              Escribe <strong>ELIMINAR</strong> para confirmar
            </label>
            <input
              id="confirmar-texto"
              className="entrada"
              data-autofoco
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="ELIMINAR"
              autoComplete="off"
            />
          </div>
        )}

        <div className="panel panel-relleno panel-plano" style={{ background: 'var(--plano)' }}>
          <div className="mayus tenue" style={{ marginBottom: 6 }}>La cuenta</div>
          <div className="dato"><span className="dato-lbl">Carrera</span><span className="dato-val">{cuenta.carrera}</span></div>
          <div className="dato"><span className="dato-lbl">Registrada</span><span className="dato-val">{cuenta.creadoEn ? fechaLarga(cuenta.creadoEn) : '—'}</span></div>
          <div className="dato">
            <span className="dato-lbl">Último ingreso</span>
            <span className="dato-val">{cuenta.ultimoIngreso ? fechaLarga(cuenta.ultimoIngreso) : 'Nunca'}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
