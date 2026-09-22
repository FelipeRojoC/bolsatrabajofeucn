import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { fechaHora, fechaLarga, formatearNumero, formatearPrecio, porcentaje } from '../lib/format'
import { descargarCSV, escaparHtml, imprimirHoja } from '../lib/exportar'
import logoFeucn from '../assets/feucn-logo.jpg'
import type { Feria, PostulacionFeria } from '../lib/types'
import { Icono } from './Iconos'
import { Modal, Nota, Vacio } from './UI'
import { Cifra } from './Graficos'
import { useApp } from '../state/contexto'

type Filtro = 'todas' | 'recibida' | 'seleccionada' | 'no-seleccionada'

export const PanelFerias = () => {
  const { revision, avisar } = useApp()
  const [feriaId, setFeriaId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [correoAbierto, setCorreoAbierto] = useState(false)
  const [creando, setCreando] = useState(false)

  const ferias = useMemo(() => {
    void revision
    return api.listarFerias()
  }, [revision])

  const feria = useMemo(
    () => ferias.find((f) => f.id === feriaId) ?? ferias.find((f) => f.estado !== 'finalizada') ?? ferias[0],
    [ferias, feriaId],
  )

  const postulaciones = useMemo(() => {
    void revision
    return feria ? api.listarPostulaciones(feria.id) : []
  }, [feria, revision])

  if (!feria) {
    return (
      <>
        <Vacio
          icono="tienda"
          titulo="Todavía no hay ferias creadas"
          texto="Crea una convocatoria para que los emprendimientos puedan postular desde el sitio."
          accion={<button className="btn btn-primario" onClick={() => setCreando(true)}><Icono nombre="mas" tam={16} /> Crear feria</button>}
        />
        <NuevaFeria abierto={creando} alCerrar={() => setCreando(false)} />
      </>
    )
  }

  const seleccionados = postulaciones.filter((p) => p.estado === 'seleccionada')
  const sinAvisar = seleccionados.filter((p) => !p.avisadoEn)
  const visibles = filtro === 'todas' ? postulaciones : postulaciones.filter((p) => p.estado === filtro)
  const conPuesto = seleccionados.filter((p) => p.puesto)
  // Quien se selecciona después de un sorteo queda sin mesa hasta el siguiente.
  const sorteoPendiente = seleccionados.filter((p) => !p.puesto)
  const pagaron = seleccionados.filter((p) => p.pagoInscripcion).length
  const entregaron = seleccionados.filter((p) => p.entregaAlimento).length

  // ── Acciones ───────────────────────────────────────────────────────────

  const cambiarEstado = async (p: PostulacionFeria, estado: PostulacionFeria['estado']) => {
    await api.cambiarEstadoPostulacion(p.id, estado)
  }

  const sortear = async () => {
    if (!seleccionados.length) return avisar('Primero selecciona a los emprendimientos.', 'error')
    const r = await api.sortearPuestos(feria.id)
    const base = r.mapau
      ? `${r.mapau} MAPAU tomaron las primeras mesas y ${r.sorteados} se sortearon.`
      : `${r.sorteados} mesas sorteadas al azar.`
    if (r.sinPuesto > 0) {
      avisar(`${base} ${r.sinPuesto} quedaron sin mesa: hay más seleccionados que mesas.`, 'error')
    } else {
      avisar(base, 'ok')
    }
  }

  const exportar = () => {
    descargarCSV(
      `postulaciones-${feria.nombre.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.csv`,
      [
        'Estado', 'Puesto', 'Nombre completo', 'RUT', 'Correo', 'Carrera',
        'Avance curricular (%)', 'Emprendimiento', 'Qué vende', 'MAPAU',
        'Pagó inscripción', 'Entregó alimento', 'Postuló', 'Avisado',
      ],
      postulaciones.map((p) => [
        p.estado === 'seleccionada' ? 'Seleccionado' : p.estado === 'no-seleccionada' ? 'No seleccionado' : 'Recibida',
        p.puesto ?? '',
        p.nombreCompleto,
        p.rut,
        p.correo,
        p.carrera,
        p.avanceCurricular,
        p.nombreEmprendimiento,
        p.descripcionBreve,
        p.esMapau,
        p.pagoInscripcion,
        p.entregaAlimento,
        fechaHora(p.creadoEn),
        p.avisadoEn ? fechaHora(p.avisadoEn) : '',
      ]),
    )
    avisar('Planilla descargada. Se abre directo en Excel.', 'ok')
  }

  const imprimirControl = () => {
    const lista = [...seleccionados].sort((a, b) => (a.puesto ?? 999) - (b.puesto ?? 999))
    if (!lista.length) return avisar('No hay seleccionados para la hoja de control.', 'error')

    const filas = lista
      .map(
        (p) => `<tr>
          <td class="num">${p.puesto ?? '—'}</td>
          <td><strong>${escaparHtml(p.nombreEmprendimiento)}</strong>${p.esMapau ? ' <em>(MAPAU)</em>' : ''}</td>
          <td>${escaparHtml(p.nombreCompleto)}<br><span style="color:#666">${escaparHtml(p.rut)}</span></td>
          <td class="firma"></td>
          <td class="firma"></td>
        </tr>`,
      )
      .join('')

    const ok = imprimirHoja(
      `Control de feria — ${feria.nombre}`,
      `<header>
         <img src="${logoFeucn}" alt="" />
         <div>
           <h1>${escaparHtml(feria.nombre)}</h1>
           <div class="sub">Hoja de control de entrega · Federación de Estudiantes UCN Antofagasta</div>
         </div>
       </header>
       <div class="meta">
         <span><strong>Fecha:</strong> ${fechaLarga(feria.fecha)}</span>
         <span><strong>Lugar:</strong> ${escaparHtml(feria.lugar)}</span>
         <span><strong>Seleccionados:</strong> ${lista.length}</span>
         <span><strong>Aporte:</strong> ${formatearPrecio(feria.montoInscripcion)}</span>
       </div>
       <table>
         <thead>
           <tr>
             <th class="num">Mesa</th>
             <th>Emprendimiento</th>
             <th>Responsable y RUT</th>
             <th>Firma — pagó ${formatearPrecio(feria.montoInscripcion)}</th>
             <th>Firma — entregó alimento</th>
           </tr>
         </thead>
         <tbody>${filas}</tbody>
       </table>
       <div class="nota">
         Cada firma confirma la entrega en la oficina de la federación. Los emprendimientos MAPAU toman las primeras mesas; el
         resto se sortea entre las que quedan.
       </div>
       <div class="pie">
         <span>Emitido el ${fechaLarga(new Date().toISOString())}</span>
         <span>Firma del encargado: ____________________________</span>
       </div>`,
    )
    if (!ok) avisar('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes.', 'error')
  }

  return (
    <>
      {/* Selector y estado */}
      <div className="fila-envuelve" style={{ marginBottom: 20, gap: 10 }}>
        <select
          className="selector"
          style={{ width: 'auto', minWidth: 280 }}
          value={feria.id}
          onChange={(e) => setFeriaId(e.target.value)}
          aria-label="Elegir feria"
        >
          {ferias.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre} · {f.estado}
            </option>
          ))}
        </select>

        <span className={`etiqueta ${feria.estado === 'abierta' ? 'etiqueta-ok' : feria.estado === 'cerrada' ? 'etiqueta-aviso' : ''}`}>
          {feria.estado === 'abierta' ? 'Postulaciones abiertas' : feria.estado === 'cerrada' ? 'Cerrada' : feria.estado}
        </span>

        <div className="crecer" />

        {feria.estado === 'abierta' ? (
          <button className="btn btn-chico" onClick={() => api.actualizarFeria(feria.id, { estado: 'cerrada' })}>
            <Icono nombre="candado" tam={15} /> Cerrar postulaciones
          </button>
        ) : feria.estado === 'cerrada' ? (
          <button className="btn btn-chico" onClick={() => api.actualizarFeria(feria.id, { estado: 'abierta' })}>
            <Icono nombre="refrescar" tam={15} /> Reabrir
          </button>
        ) : null}
        <button className="btn btn-primario btn-chico" onClick={() => setCreando(true)}>
          <Icono nombre="mas" tam={15} /> Nueva feria
        </button>
      </div>

      <div className="grilla-cifras" style={{ marginBottom: 22 }}>
        <Cifra
          etiqueta="Postulaciones"
          valor={`${formatearNumero(postulaciones.length)} / ${feria.cupos}`}
          pie={feria.estado === 'abierta' ? `Quedan ${Math.max(0, feria.cupos - postulaciones.length)} cupos` : 'Convocatoria cerrada'}
        />
        <Cifra
          etiqueta="Seleccionados"
          valor={`${formatearNumero(seleccionados.length)} / ${feria.puestos}`}
          pie={`${conPuesto.length} con mesa asignada`}
        />
        <Cifra
          etiqueta="Aporte recibido"
          valor={`${pagaron} de ${seleccionados.length}`}
          pie={`${formatearPrecio(pagaron * feria.montoInscripcion)} en caja`}
        />
        <Cifra
          etiqueta="Alimentos recibidos"
          valor={`${entregaron} de ${seleccionados.length}`}
          pie={seleccionados.length ? porcentaje(entregaron, seleccionados.length, 0) : '—'}
        />
      </div>

      {/* Acciones */}
      <div className="panel panel-relleno" style={{ marginBottom: 20 }}>
        <div className="mayus tenue" style={{ marginBottom: 12 }}>Flujo de la feria</div>
        <div className="fila-envuelve" style={{ gap: 8 }}>
          <button
            className="btn btn-chico"
            onClick={async () => {
              const pendientes = postulaciones.filter((p) => p.estado === 'recibida')
              const libres = feria.puestos - seleccionados.length
              for (const p of pendientes.slice(0, Math.max(0, libres))) {
                await api.cambiarEstadoPostulacion(p.id, 'seleccionada')
              }
              avisar(`Seleccionados los primeros ${Math.min(pendientes.length, Math.max(0, libres))} por orden de llegada.`, 'ok')
            }}
            disabled={feria.estado === 'abierta'}
          >
            <Icono nombre="visto" tam={15} /> Seleccionar por orden de llegada
          </button>

          <button className="btn btn-chico" onClick={sortear} disabled={!seleccionados.length}>
            <Icono nombre="destello" tam={15} /> Sortear mesas
          </button>

          <button className="btn btn-chico" onClick={() => setCorreoAbierto(true)} disabled={!seleccionados.length}>
            <Icono nombre="correo" tam={15} /> Avisar a los seleccionados
            {sinAvisar.length > 0 && <span className="pestana-cuenta">{sinAvisar.length}</span>}
          </button>

          <button className="btn btn-chico" onClick={exportar}>
            <Icono nombre="descargar" tam={15} /> Descargar planilla (Excel)
          </button>

          <button className="btn btn-chico" onClick={imprimirControl} disabled={!seleccionados.length}>
            <Icono nombre="archivo" tam={15} /> Hoja de control (PDF)
          </button>
        </div>
        {feria.estado === 'abierta' && (
          <p className="mini muy-tenue" style={{ marginTop: 10, marginBottom: 0 }}>
            La selección masiva se habilita al cerrar la convocatoria, para no seleccionar antes de que postulen todos.
          </p>
        )}
      </div>

      {conPuesto.length > 0 && sorteoPendiente.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Nota tono="aviso" icono="alerta">
            <strong>
              {sorteoPendiente.length === 1
                ? 'Hay un seleccionado sin mesa'
                : `Hay ${sorteoPendiente.length} seleccionados sin mesa`}
              .
            </strong>{' '}
            Se sumaron después del último sorteo. Vuelve a sortear para repartir las mesas de nuevo.
          </Nota>
        </div>
      )}

      {/* Filtros */}
      <div className="pestanas" role="tablist" style={{ marginBottom: 16 }}>
        {([
          { id: 'todas' as const, texto: 'Todas', n: postulaciones.length },
          { id: 'recibida' as const, texto: 'Sin revisar', n: postulaciones.filter((p) => p.estado === 'recibida').length },
          { id: 'seleccionada' as const, texto: 'Seleccionadas', n: seleccionados.length },
          { id: 'no-seleccionada' as const, texto: 'Descartadas', n: postulaciones.filter((p) => p.estado === 'no-seleccionada').length },
        ]).map((t) => (
          <button key={t.id} className="pestana" role="tab" aria-selected={filtro === t.id} onClick={() => setFiltro(t.id)}>
            {t.texto}
            <span className="pestana-cuenta">{t.n}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <Vacio icono="usuarios" titulo="Nada en esta lista" texto="Cuando lleguen postulaciones van a aparecer acá." />
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col" className="num">Mesa</th>
                <th scope="col">Emprendimiento</th>
                <th scope="col">Responsable</th>
                <th scope="col">Carrera</th>
                <th scope="col" className="num">Avance</th>
                <th scope="col">Control</th>
                <th scope="col">Decisión</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id}>
                  <td className="num">
                    {p.estado === 'seleccionada' ? (
                      <input
                        className="entrada"
                        type="number"
                        min={1}
                        max={feria.puestos}
                        value={p.puesto ?? ''}
                        onChange={(e) => api.asignarPuesto(p.id, e.target.value ? Number(e.target.value) : undefined)}
                        style={{ width: 66, padding: '5px 7px', textAlign: 'center' }}
                        aria-label={`Mesa de ${p.nombreEmprendimiento}`}
                      />
                    ) : (
                      <span className="muy-tenue">—</span>
                    )}
                  </td>
                  <th scope="row" style={{ maxWidth: 230 }}>
                    <span className="recorte-2">{p.nombreEmprendimiento}</span>
                    <span className="mini muy-tenue" style={{ display: 'block', fontWeight: 400 }}>
                      <span className="recorte-2">{p.descripcionBreve}</span>
                    </span>
                    {p.esMapau && <span className="etiqueta etiqueta-marca" style={{ marginTop: 4 }}>MAPAU · primeras mesas</span>}
                  </th>
                  <td>
                    <span className="chico">{p.nombreCompleto}</span>
                    <span className="mini muy-tenue" style={{ display: 'block' }}>{p.rut} · {p.correo}</span>
                  </td>
                  <td className="chico tenue">{p.carrera}</td>
                  <td className="num">{p.avanceCurricular}%</td>
                  <td>
                    <div className="columna" style={{ gap: 4 }}>
                      <label className="fila mini" style={{ gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={p.pagoInscripcion} onChange={(e) => api.marcarControl(p.id, 'pagoInscripcion', e.target.checked)} />
                        {formatearPrecio(feria.montoInscripcion)}
                      </label>
                      {feria.pideAlimento && (
                        <label className="fila mini" style={{ gap: 6, cursor: 'pointer' }}>
                          <input type="checkbox" checked={p.entregaAlimento} onChange={(e) => api.marcarControl(p.id, 'entregaAlimento', e.target.checked)} />
                          Alimento
                        </label>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="fila" style={{ gap: 5 }}>
                      <button
                        className={`btn btn-chico ${p.estado === 'seleccionada' ? 'btn-ok' : 'btn-fantasma'}`}
                        onClick={() => cambiarEstado(p, p.estado === 'seleccionada' ? 'recibida' : 'seleccionada')}
                        aria-pressed={p.estado === 'seleccionada'}
                        title="Seleccionar"
                      >
                        <Icono nombre="visto" tam={14} />
                      </button>
                      <button
                        className={`btn btn-chico ${p.estado === 'no-seleccionada' ? 'btn-peligro' : 'btn-fantasma'}`}
                        onClick={() => cambiarEstado(p, p.estado === 'no-seleccionada' ? 'recibida' : 'no-seleccionada')}
                        aria-pressed={p.estado === 'no-seleccionada'}
                        title="Descartar"
                      >
                        <Icono nombre="cerrar" tam={14} />
                      </button>
                    </div>
                    {p.avisadoEn && <span className="mini muy-tenue" style={{ display: 'block', marginTop: 3 }}>Avisado</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AvisoSeleccionados
        abierto={correoAbierto}
        alCerrar={() => setCorreoAbierto(false)}
        feria={feria}
        seleccionados={seleccionados}
      />
      <NuevaFeria abierto={creando} alCerrar={() => setCreando(false)} />
    </>
  )
}

/* ── Aviso por correo ──────────────────────────────────────────────────── */

const AvisoSeleccionados = ({
  abierto,
  alCerrar,
  feria,
  seleccionados,
}: {
  abierto: boolean
  alCerrar: () => void
  feria: Feria
  seleccionados: PostulacionFeria[]
}) => {
  const { avisar } = useApp()
  if (!abierto) return null

  const correos = seleccionados.map((p) => p.correo)
  const asunto = `Quedaste seleccionado en la ${feria.nombre}`

  const cuerpoPara = (p: PostulacionFeria) =>
    `Hola ${p.nombreCompleto.split(' ')[0]}:

¡Buenas noticias! "${p.nombreEmprendimiento}" quedó seleccionado para la ${feria.nombre}.

· Fecha: ${fechaLarga(feria.fecha)}
· Lugar: ${feria.lugar}
· Tu mesa: N° ${p.puesto ?? 'por asignar'}${p.esMapau ? ' (MAPAU)' : ' (asignada por sorteo)'}

Para confirmar tu cupo tienes que pasar por la oficina de la federación antes del evento con:
1. El aporte de inscripción de ${formatearPrecio(feria.montoInscripcion)}.
${feria.pideAlimento ? '2. Un alimento no perecible.\n' : ''}
Si no puedes asistir, avísanos con 48 horas de anticipación para darle el cupo a otra persona.

Nos vemos,
Federación de Estudiantes UCN Antofagasta`

  const cuerpoGenerico = cuerpoPara({
    ...seleccionados[0],
    nombreCompleto: '[NOMBRE]',
    nombreEmprendimiento: '[EMPRENDIMIENTO]',
    puesto: undefined,
    esMapau: false,
  } as PostulacionFeria)

  const copiar = async (texto: string, que: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      avisar(`${que} copiado`, 'ok')
    } catch {
      avisar('El navegador no dejó copiar', 'error')
    }
  }

  const abrirCorreo = () => {
    const url = `mailto:?bcc=${encodeURIComponent(correos.join(','))}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoGenerico)}`
    if (url.length > 1900) {
      avisar('Son demasiados correos para abrirlos de una. Copia la lista y pégala en tu cliente de correo.', 'error')
      return
    }
    // Un enlace temporal en vez de tocar location: no deja la página a medio
    // navegar si el sistema no tiene cliente de correo configurado.
    const a = document.createElement('a')
    a.href = url
    a.click()
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      ancho
      titulo="Avisar a los seleccionados"
      subtitulo={`${seleccionados.length} emprendimientos quedaron dentro`}
      pie={
        <>
          <button className="btn btn-fantasma" onClick={alCerrar}>Cerrar</button>
          <button
            className="btn btn-primario"
            onClick={async () => {
              const n = await api.marcarAvisados(feria.id)
              avisar(n ? `${n} marcados como avisados` : 'Ya estaban todos avisados', 'ok')
              alCerrar()
            }}
          >
            <Icono nombre="visto" tam={16} /> Marcar como avisados
          </button>
        </>
      }
    >
      <div className="columna" style={{ gap: 16 }}>
        <Nota tono="aviso" icono="info">
          <strong>El envío automático necesita el backend.</strong> Mientras la base no esté conectada, acá tienes la
          lista y el texto listos para pegar en el correo de la federación. Con Supabase conectado, este mismo botón
          dispara el envío desde el servidor.
        </Nota>

        <div className="campo">
          <span className="campo-titulo">Correos ({correos.length})</span>
          <textarea className="area" style={{ minHeight: 84 }} readOnly value={correos.join(', ')} />
          <div className="fila" style={{ gap: 8 }}>
            <button className="btn btn-chico" onClick={() => copiar(correos.join(', '), 'Correos')}>
              <Icono nombre="archivo" tam={14} /> Copiar correos
            </button>
            <button className="btn btn-chico" onClick={abrirCorreo}>
              <Icono nombre="correo" tam={14} /> Abrir en mi correo
            </button>
          </div>
        </div>

        <div className="campo">
          <span className="campo-titulo">Mensaje</span>
          <textarea className="area" style={{ minHeight: 230, fontSize: '0.84rem' }} readOnly value={cuerpoGenerico} />
          <button className="btn btn-chico" onClick={() => copiar(cuerpoGenerico, 'Mensaje')} style={{ alignSelf: 'flex-start' }}>
            <Icono nombre="archivo" tam={14} /> Copiar mensaje
          </button>
          <span className="campo-ayuda">
            Reemplaza [NOMBRE], [EMPRENDIMIENTO] y el número de puesto, o usa la planilla de Excel para hacer una
            combinación de correspondencia.
          </span>
        </div>
      </div>
    </Modal>
  )
}

/* ── Nueva feria ───────────────────────────────────────────────────────── */

const NuevaFeria = ({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) => {
  const { avisar } = useApp()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState('')
  const [lugar, setLugar] = useState('Patio de las banderas, Campus Central')
  const [cupos, setCupos] = useState('40')
  const [puestos, setPuestos] = useState('24')
  const [monto, setMonto] = useState('1000')
  const [pideAlimento, setPideAlimento] = useState(true)
  const [abrirYa, setAbrirYa] = useState(true)

  if (!abierto) return null
  const valido = nombre.trim().length > 4 && fecha && Number(cupos) > 0 && Number(puestos) > 0

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo="Nueva feria"
      subtitulo="Al abrirla, la convocatoria aparece en el sitio y la gente puede postular."
      pie={
        <>
          <button className="btn btn-fantasma" onClick={alCerrar}>Cancelar</button>
          <button
            className="btn btn-primario"
            disabled={!valido}
            onClick={async () => {
              await api.crearFeria({
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || 'Feria de emprendimientos de la comunidad UCN.',
                fecha: new Date(`${fecha}T12:00:00`).toISOString(),
                lugar: lugar.trim(),
                cupos: Number(cupos),
                puestos: Number(puestos),
                montoInscripcion: Number(monto),
                pideAlimento,
                estado: abrirYa ? 'abierta' : 'borrador',
                abiertaDesde: abrirYa ? new Date().toISOString() : undefined,
              })
              avisar(abrirYa ? 'Feria creada y postulaciones abiertas' : 'Feria guardada como borrador', 'ok')
              alCerrar()
              setNombre(''); setDescripcion(''); setFecha('')
            }}
          >
            <Icono nombre="mas" tam={16} /> Crear feria
          </button>
        </>
      }
    >
      <div className="columna" style={{ gap: 16 }}>
        <div className="campo">
          <label htmlFor="nf-nombre">Nombre</label>
          <input id="nf-nombre" className="entrada" data-autofoco value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Feria de Emprendimientos FEUCN — Primavera" />
        </div>
        <div className="campo">
          <label htmlFor="nf-desc">Descripción</label>
          <textarea id="nf-desc" className="area" style={{ minHeight: 96 }} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Qué es la feria, qué incluye el puesto y cómo se entrega el aporte." />
        </div>
        <div className="grupo-campos grupo-2">
          <div className="campo">
            <label htmlFor="nf-fecha">Fecha del evento</label>
            <input id="nf-fecha" className="entrada" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="nf-lugar">Lugar</label>
            <input id="nf-lugar" className="entrada" value={lugar} onChange={(e) => setLugar(e.target.value)} />
          </div>
        </div>
        <div className="grupo-campos grupo-2">
          <div className="campo">
            <label htmlFor="nf-cupos">Cupo de postulaciones</label>
            <input id="nf-cupos" className="entrada" type="number" min={1} value={cupos} onChange={(e) => setCupos(e.target.value)} />
            <span className="campo-ayuda">Al llegar a este número, la convocatoria se cierra sola.</span>
          </div>
          <div className="campo">
            <label htmlFor="nf-puestos">Puestos disponibles</label>
            <input id="nf-puestos" className="entrada" type="number" min={1} value={puestos} onChange={(e) => setPuestos(e.target.value)} />
            <span className="campo-ayuda">Los que se sortean entre los seleccionados.</span>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="nf-monto">Aporte de inscripción (CLP)</label>
          <input id="nf-monto" className="entrada" type="number" min={0} step={500} value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        <label className="interruptor">
          <input type="checkbox" checked={pideAlimento} onChange={(e) => setPideAlimento(e.target.checked)} />
          <span className="interruptor-pista" />
          <span className="chico">Pedir además un alimento no perecible</span>
        </label>
        <label className="interruptor">
          <input type="checkbox" checked={abrirYa} onChange={(e) => setAbrirYa(e.target.checked)} />
          <span className="interruptor-pista" />
          <span className="chico">Abrir las postulaciones de inmediato</span>
        </label>
      </div>
    </Modal>
  )
}
