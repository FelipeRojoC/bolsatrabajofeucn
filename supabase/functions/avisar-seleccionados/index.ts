/**
 * Edge Function: avisa por correo a los seleccionados de una feria.
 *
 * Es la pieza que falta para que el botón "Avisar a los seleccionados" del
 * panel mande los correos de verdad en vez de dejarlos listos para copiar.
 *
 * Desplegar:
 *   npx supabase functions deploy avisar-seleccionados
 *   npx supabase secrets set RESEND_API_KEY=re_xxx CORREO_REMITENTE="FEUCN <feria@feucn.cl>"
 *
 * Usa SERVICE_ROLE, así que se salta RLS: por eso verifica primero que quien
 * llama sea del equipo antes de tocar nada.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

const clp = (n: number) => `$${n.toLocaleString('es-CL')}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Falta la sesión' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1. ¿Quién llama? Con su propio token, no con el de servicio.
    const comoUsuario = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: sesion } = await comoUsuario.auth.getUser()
    if (!sesion?.user) return json({ error: 'Sesión inválida' }, 401)

    const { data: perfil } = await comoUsuario
      .from('perfiles')
      .select('rol, nombre')
      .eq('id', sesion.user.id)
      .single()

    if (!perfil || !['admin', 'moderador'].includes(perfil.rol)) {
      return json({ error: 'Esta acción es solo del equipo de la federación' }, 403)
    }

    const { feriaId } = await req.json()
    if (!feriaId) return json({ error: 'Falta feriaId' }, 400)

    // 2. Ya autorizado, se usa el cliente de servicio.
    const admin = createClient(url, service)

    const { data: feria, error: errFeria } = await admin
      .from('ferias')
      .select('*')
      .eq('id', feriaId)
      .single()
    if (errFeria || !feria) return json({ error: 'Feria no encontrada' }, 404)

    const { data: seleccionados } = await admin
      .from('postulaciones_feria')
      .select('*')
      .eq('feria_id', feriaId)
      .eq('estado', 'seleccionada')
      .is('avisado_en', null)

    if (!seleccionados?.length) return json({ enviados: 0, mensaje: 'No hay nadie pendiente de avisar' })

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const remitente = Deno.env.get('CORREO_REMITENTE') ?? 'FEUCN <onboarding@resend.dev>'
    if (!resendKey) return json({ error: 'Falta configurar RESEND_API_KEY' }, 500)

    const fecha = new Date(feria.fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    const enviados: string[] = []
    const fallidos: { correo: string; motivo: string }[] = []

    for (const p of seleccionados) {
      const html = `
        <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;color:#111">
          <h2 style="color:#0b7a54;margin:0 0 4px">¡Quedaste seleccionado!</h2>
          <p style="color:#555;margin:0 0 20px">${feria.nombre}</p>
          <p>Hola ${p.nombre_completo.split(' ')[0]}:</p>
          <p><strong>${p.nombre_emprendimiento}</strong> quedó seleccionado para la feria.</p>
          <table style="border-collapse:collapse;margin:18px 0">
            <tr><td style="padding:4px 14px 4px 0;color:#555">Fecha</td><td><strong>${fecha}</strong></td></tr>
            <tr><td style="padding:4px 14px 4px 0;color:#555">Lugar</td><td><strong>${feria.lugar}</strong></td></tr>
            <tr><td style="padding:4px 14px 4px 0;color:#555">Tu mesa</td><td><strong>N° ${p.puesto ?? 'por asignar'}</strong> ${
              p.es_mapau ? '(MAPAU)' : '(asignada por sorteo)'
            }</td></tr>
          </table>
          <p>Para confirmar tu cupo, pasa por la oficina de la federación antes del evento con:</p>
          <ol>
            <li>El aporte de inscripción de <strong>${clp(feria.monto_inscripcion)}</strong>.</li>
            ${feria.pide_alimento ? '<li>Un <strong>alimento no perecible</strong>.</li>' : ''}
          </ol>
          <p style="color:#555;font-size:14px">
            Si no puedes asistir, avísanos con 48 horas de anticipación para darle el cupo a otra persona.
          </p>
          <p style="margin-top:24px">Federación de Estudiantes UCN Antofagasta</p>
        </div>`

      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: remitente,
          to: [p.correo],
          subject: `Quedaste seleccionado en la ${feria.nombre}`,
          html,
        }),
      })

      if (r.ok) {
        enviados.push(p.id)
      } else {
        fallidos.push({ correo: p.correo, motivo: await r.text() })
      }
    }

    // Solo se marca como avisado a quien recibió el correo de verdad.
    if (enviados.length) {
      await admin
        .from('postulaciones_feria')
        .update({ avisado_en: new Date().toISOString() })
        .in('id', enviados)
    }

    return json({ enviados: enviados.length, fallidos })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
