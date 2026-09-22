-- ============================================================================
-- Endurecimiento de seguridad — ejecutar DESPUÉS de schema.sql
--
-- SQL Editor → New query → pegar todo → Run. Se puede repetir sin romper nada.
--
-- Corrige una escalada de privilegios y agrega límites contra abuso.
-- ============================================================================

-- ── 1. ESCALADA DE PRIVILEGIOS ─────────────────────────────────────────────
-- La política de perfiles deja a cada persona editar su propia fila, pero RLS
-- no distingue columnas: nada impedía que alguien con cuenta hiciera
--   update perfiles set rol = 'admin' where id = auth.uid()
-- y entrara al panel con los RUT y correos de las postulaciones.

create or replace function proteger_rol()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Solo el equipo puede cambiar roles; nadie se asciende a sí mismo.
  if new.rol is distinct from old.rol and not es_admin() then
    raise exception 'No tienes permiso para cambiar el rol de una cuenta';
  end if;
  -- La identidad tampoco se toca: apunta a auth.users.
  if new.id is distinct from old.id then
    raise exception 'No se puede cambiar el identificador de un perfil';
  end if;
  return new;
end $$;

drop trigger if exists no_escalar_privilegios on perfiles;
create trigger no_escalar_privilegios
  before update on perfiles
  for each row execute function proteger_rol();

-- Segunda barrera, independiente del trigger: quitar el permiso de escribir
-- esa columna. Si un día alguien borra el trigger, esto sigue en pie.
revoke update (rol) on perfiles from authenticated, anon;

-- El equipo sí necesita poder editar perfiles ajenos para nombrar moderadores.
drop policy if exists "editar perfil propio" on perfiles;
create policy "editar perfil propio" on perfiles
  for update using (auth.uid() = id or es_admin())
  with check (auth.uid() = id or es_admin());

-- Para nombrar a alguien, el equipo usa esta función en vez del update directo.
create or replace function asignar_rol(p_correo text, p_rol rol_usuario)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'Solo el equipo puede asignar roles';
  end if;
  update perfiles set rol = p_rol where correo = lower(trim(p_correo));
end $$;

-- ── 2. LÍMITES DE TAMAÑO ───────────────────────────────────────────────────
-- Sin tope, una sola petición puede dejar la base con megabytes de basura.

do $$ begin
  alter table avisos add constraint avisos_descripcion_max check (char_length(descripcion) <= 1500);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table avisos add constraint avisos_imagenes_max check (array_length(imagenes, 1) is null or array_length(imagenes, 1) <= 3);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table avisos add constraint avisos_zona_max check (char_length(lugar_zona) <= 80);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table avisos add constraint avisos_referencia_max check (lugar_referencia is null or char_length(lugar_referencia) <= 200);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table avisos add constraint avisos_precio_max check (precio is null or precio <= 100000000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table postulaciones_feria add constraint post_nombre_max check (char_length(nombre_completo) between 5 and 120);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table postulaciones_feria add constraint post_desc_max check (char_length(descripcion_breve) between 20 and 400);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table postulaciones_feria add constraint post_emp_max check (char_length(nombre_emprendimiento) between 2 and 80);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table reportes add constraint reportes_detalle_max check (detalle is null or char_length(detalle) <= 1000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table respuestas_foro add constraint respuestas_autor_max check (char_length(autor_nombre) <= 120);
exception when duplicate_object then null; end $$;

-- ── 3. FORMATOS ────────────────────────────────────────────────────────────
-- El correo y el RUT se validan en el navegador, pero el navegador no es una
-- barrera: cualquiera puede hablarle a la API directamente.

create or replace function rut_valido(p_rut text)
returns boolean
language plpgsql
immutable
as $$
declare
  limpio text;
  cuerpo text;
  dv text;
  suma integer := 0;
  mult integer := 2;
  i integer;
  resto integer;
begin
  limpio := upper(regexp_replace(coalesce(p_rut, ''), '[^0-9kK]', '', 'g'));
  if char_length(limpio) < 8 or char_length(limpio) > 9 then return false; end if;

  cuerpo := left(limpio, -1);
  dv := right(limpio, 1);
  if cuerpo !~ '^[0-9]+$' then return false; end if;

  for i in reverse char_length(cuerpo)..1 loop
    suma := suma + (substr(cuerpo, i, 1))::integer * mult;
    mult := case when mult = 7 then 2 else mult + 1 end;
  end loop;

  resto := 11 - (suma % 11);
  return dv = case when resto = 11 then '0' when resto = 10 then 'K' else resto::text end;
end $$;

do $$ begin
  alter table postulaciones_feria add constraint post_rut_valido check (rut_valido(rut));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table postulaciones_feria add constraint post_correo_formato
    check (correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
exception when duplicate_object then null; end $$;

-- El RUT se guarda siempre con el mismo formato: si no, el índice único deja
-- pasar "12345678-9" y "12.345.678-9" como si fueran personas distintas.
create or replace function normalizar_rut()
returns trigger
language plpgsql
as $$
declare
  limpio text;
begin
  limpio := upper(regexp_replace(new.rut, '[^0-9kK]', '', 'g'));
  new.rut := regexp_replace(left(limpio, -1), '(\d)(?=(\d{3})+$)', '\1.', 'g') || '-' || right(limpio, 1);
  new.correo := lower(trim(new.correo));
  return new;
end $$;

drop trigger if exists normalizar_datos_postulacion on postulaciones_feria;
create trigger normalizar_datos_postulacion
  before insert or update on postulaciones_feria
  for each row execute function normalizar_rut();

-- ── 4. ABUSO DE CONTADORES ─────────────────────────────────────────────────
-- registrar_evento es pública a propósito (hay que poder contar visitas de
-- gente sin cuenta), pero sin límite alguien puede inflar las estadísticas con
-- un bucle. Se acota a avisos que existen y están publicados.

create or replace function registrar_evento(
  p_kind text,
  p_target_id uuid,
  p_target_type text default 'post'
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  existe boolean;
begin
  if p_kind not in ('vista', 'clic-contacto', 'guardado', 'compartido', 'publicacion') then
    raise exception 'Tipo de evento desconocido';
  end if;

  if p_target_type = 'post' then
    select exists (
      select 1 from avisos
      where id = p_target_id and status in ('aprobado', 'expirado', 'archivado')
    ) into existe;
  else
    select exists (
      select 1 from emprendimientos where id = p_target_id and status = 'aprobado'
    ) into existe;
  end if;

  -- Silencioso a propósito: un contador no debe filtrar qué ids existen.
  if not existe then return; end if;

  insert into eventos (kind, target_id, target_type, post_type)
  values (p_kind, p_target_id, p_target_type, (select tipo from avisos where id = p_target_id));

  if p_target_type = 'post' then
    update avisos set
      vistas         = vistas         + (case when p_kind = 'vista'         then 1 else 0 end),
      clics_contacto = clics_contacto + (case when p_kind = 'clic-contacto' then 1 else 0 end),
      guardados      = guardados      + (case when p_kind = 'guardado'      then 1 else 0 end),
      compartidos    = compartidos    + (case when p_kind = 'compartido'    then 1 else 0 end)
    where id = p_target_id;
  else
    update emprendimientos set
      vistas         = vistas         + (case when p_kind = 'vista'         then 1 else 0 end),
      clics_contacto = clics_contacto + (case when p_kind = 'clic-contacto' then 1 else 0 end)
    where id = p_target_id;
  end if;
end $$;

-- Nadie escribe la tabla de eventos a mano: solo a través de esa función.
revoke insert on eventos from anon, authenticated;
-- Postgres da EXECUTE a PUBLIC por defecto, y anon/authenticated heredan de
-- ahí: revocar solo a esos dos roles no quita nada. Hay que ir contra PUBLIC.
revoke execute on function registrar_evento(text, uuid, text) from public;
grant execute on function registrar_evento(text, uuid, text) to anon, authenticated;

-- ── 5. CONTADORES Y ESTADOS A PRUEBA DE MANIPULACIÓN ───────────────────────
-- El autor de un aviso puede editarlo. Sin esto podría escribir vistas = 99999
-- para falsear las estadísticas públicas, aprobarse solo o estirar su vigencia
-- más allá de los 5 días.
--
-- El reparto es: RLS decide QUIÉN puede tocar la fila, este trigger decide QUÉ
-- cambios son válidos. Por eso la política de abajo se abre a cualquier estado:
-- lo que la cierra de verdad es esto.

create or replace function proteger_aviso()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  renovacion boolean;
begin
  if es_admin() then
    return new;
  end if;

  -- Los contadores y el puntaje de riesgo solo los mueve el servidor.
  new.vistas         := old.vistas;
  new.clics_contacto := old.clics_contacto;
  new.guardados      := old.guardados;
  new.compartidos    := old.compartidos;
  new.riesgo         := old.riesgo;
  new.banderas       := old.banderas;
  new.moderado_por   := old.moderado_por;
  new.moderado_en    := old.moderado_en;
  new.motivo_rechazo := old.motivo_rechazo;
  new.autor_id       := old.autor_id;

  -- Una renovación válida: de expirado a publicado, una sola vez, 5 días más.
  renovacion :=
    old.status = 'expirado'
    and new.status = 'aprobado'
    and old.renovaciones = 0
    and new.renovaciones = 1
    and new.expira_en <= now() + (new.dias_vigencia || ' days')::interval + interval '1 minute';

  if new.status = 'aprobado' and old.status <> 'aprobado' and not renovacion then
    raise exception 'Un aviso solo lo publica la moderación';
  end if;

  if new.renovaciones > old.renovaciones and not renovacion then
    raise exception 'Renovación no válida';
  end if;

  -- Fuera de la renovación, la fecha de vencimiento no se toca.
  if not renovacion and new.expira_en is distinct from old.expira_en then
    new.expira_en := old.expira_en;
  end if;

  if new.dias_vigencia is distinct from old.dias_vigencia then
    new.dias_vigencia := old.dias_vigencia;
  end if;

  return new;
end $$;

drop trigger if exists no_falsear_contadores on avisos;
drop trigger if exists proteger_aviso_trigger on avisos;
create trigger proteger_aviso_trigger
  before update on avisos
  for each row execute function proteger_aviso();

-- Con el trigger puesto, la política puede dejar al autor tocar su aviso en
-- cualquier estado: necesita poder cerrar un caso del foro (que está aprobado)
-- y renovar uno expirado. Antes eso quedaba bloqueado.
drop policy if exists "editar aviso propio" on avisos;
create policy "editar aviso propio" on avisos
  for update using (autor_id = auth.uid() or es_admin())
  with check (autor_id = auth.uid() or es_admin());

-- ── 6. SUPERFICIE EXPUESTA ─────────────────────────────────────────────────
-- Las funciones internas no tienen por qué ser llamables desde el navegador.

revoke execute on function expirar_avisos() from public;
revoke execute on function crear_perfil_nuevo() from public;
revoke execute on function proteger_rol() from public;
revoke execute on function proteger_aviso() from public;
revoke execute on function cerrar_feria_si_llena() from public;
revoke execute on function verificar_feria_abierta() from public;
revoke execute on function normalizar_rut() from public;

revoke execute on function asignar_rol(text, rol_usuario) from public;
grant execute on function asignar_rol(text, rol_usuario) to authenticated;

-- ── Qué falta, y no se puede hacer desde SQL ───────────────────────────────
--
-- 1. Authentication → Policies → activa "Leaked password protection".
--    Rechaza contraseñas que ya aparecieron en filtraciones conocidas.
--
-- 2. Authentication → Rate limits → baja el límite de intentos de ingreso.
--
-- 3. Authentication → URL Configuration → deja en "Site URL" y "Redirect URLs"
--    solo el dominio real del sitio. Con un comodín, un atacante puede
--    llevarse el token de sesión a su propio dominio.
--
-- 4. Un captcha en el formulario de la feria. Postular no pide cuenta —así
--    tiene que ser— pero eso deja la puerta abierta a un script que llene los
--    cupos con RUT válidos generados. Supabase trae soporte para hCaptcha y
--    Cloudflare Turnstile en Authentication → Settings.
