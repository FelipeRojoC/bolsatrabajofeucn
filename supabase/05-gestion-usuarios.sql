-- ============================================================================
-- Gestión de usuarios — ejecutar DESPUÉS de 04-cuentas-estudiantes.sql
--
-- SQL Editor → New query → pegar todo → Run. Se puede repetir sin romper nada.
--
-- Le da al equipo un panel de cuentas: ver quién está registrado, suspender y
-- eliminar. Al suspender o eliminar se retira TODO lo que esa persona publicó,
-- que es lo que hace que moderar sirva de algo.
-- ============================================================================

-- ── Estado de la cuenta ────────────────────────────────────────────────────

alter table perfiles add column if not exists suspendido boolean not null default false;
alter table perfiles add column if not exists suspendido_en timestamptz;
alter table perfiles add column if not exists motivo_suspension text;

create index if not exists perfiles_suspendido_idx on perfiles (suspendido) where suspendido;

-- Ni el trigger de roles ni nadie sin permisos puede tocar esto.
revoke update (suspendido, suspendido_en, motivo_suspension) on perfiles from authenticated, anon;

-- ── Borrado del contenido ──────────────────────────────────────────────────
-- Una sola función, para que suspender y eliminar dejen el sitio igual de
-- limpio y no se olvide una tabla.

create or replace function borrar_contenido_usuario(p_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  n_avisos integer;
  n_respuestas integer;
  n_emprendimientos integer;
  n_postulaciones integer;
  n_reportes integer;
begin
  -- Las respuestas del foro que escribió en hilos ajenos.
  delete from respuestas_foro where autor_id = p_id;
  get diagnostics n_respuestas = row_count;

  -- Sus avisos, y con ellos las respuestas y reportes que colgaban de cada uno
  -- (las llaves foráneas están en cascada).
  delete from avisos where autor_id = p_id;
  get diagnostics n_avisos = row_count;

  delete from emprendimientos where dueno_id = p_id;
  get diagnostics n_emprendimientos = row_count;

  -- Las postulaciones a ferias se guardan por correo, no por cuenta.
  delete from postulaciones_feria
   where correo = (select correo from perfiles where id = p_id);
  get diagnostics n_postulaciones = row_count;

  delete from reportes where reportado_por = p_id;
  get diagnostics n_reportes = row_count;

  return jsonb_build_object(
    'avisos', n_avisos,
    'respuestas', n_respuestas,
    'emprendimientos', n_emprendimientos,
    'postulaciones', n_postulaciones,
    'reportes', n_reportes
  );
end $$;

-- ── Suspender ──────────────────────────────────────────────────────────────
-- La cuenta queda: el correo sigue tomado, así que no puede volver a
-- registrarse con el mismo. banned_until bloquea el ingreso en Supabase Auth,
-- no solo en la interfaz.

create or replace function suspender_cuenta(p_id uuid, p_motivo text default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  borrado jsonb;
begin
  if not es_admin() then
    raise exception 'Solo el equipo puede suspender cuentas';
  end if;
  if p_id = auth.uid() then
    raise exception 'No puedes suspender tu propia cuenta';
  end if;
  if exists (select 1 from perfiles where id = p_id and rol = 'admin') then
    raise exception 'No se puede suspender una cuenta de administración';
  end if;

  borrado := borrar_contenido_usuario(p_id);

  update perfiles
     set suspendido = true,
         suspendido_en = now(),
         motivo_suspension = nullif(trim(coalesce(p_motivo, '')), '')
   where id = p_id;

  update auth.users set banned_until = 'infinity'::timestamptz where id = p_id;

  return borrado;
end $$;

create or replace function reactivar_cuenta(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'Solo el equipo puede reactivar cuentas';
  end if;

  update perfiles
     set suspendido = false, suspendido_en = null, motivo_suspension = null
   where id = p_id;

  update auth.users set banned_until = null where id = p_id;
end $$;

-- ── Eliminar ───────────────────────────────────────────────────────────────
-- Borra la cuenta de verdad. El correo queda libre y esa persona puede volver
-- a registrarse; para que no pueda, se suspende en vez de eliminar.

create or replace function eliminar_cuenta(p_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  borrado jsonb;
begin
  if not es_admin() then
    raise exception 'Solo el equipo puede eliminar cuentas';
  end if;
  if p_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta';
  end if;
  if exists (select 1 from perfiles where id = p_id and rol = 'admin') then
    raise exception 'No se puede eliminar una cuenta de administración';
  end if;

  borrado := borrar_contenido_usuario(p_id);

  -- perfiles.id apunta a auth.users con on delete cascade: esto se lleva las dos.
  delete from auth.users where id = p_id;

  return borrado;
end $$;

-- ── Listado para el panel ──────────────────────────────────────────────────
-- Devuelve cada cuenta con cuánto tiene publicado, para decidir con contexto
-- antes de borrar nada.

create or replace function usuarios_panel()
returns table (
  id uuid,
  nombre text,
  correo text,
  carrera text,
  rol rol_usuario,
  avatar text,
  creado_en timestamptz,
  suspendido boolean,
  suspendido_en timestamptz,
  motivo_suspension text,
  ultimo_ingreso timestamptz,
  correo_confirmado boolean,
  avisos integer,
  avisos_activos integer,
  respuestas integer,
  emprendimientos integer
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'Solo el equipo puede ver el listado de cuentas';
  end if;

  return query
    select
      p.id, p.nombre, p.correo, p.carrera, p.rol, p.avatar, p.creado_en,
      p.suspendido, p.suspendido_en, p.motivo_suspension,
      u.last_sign_in_at,
      u.email_confirmed_at is not null,
      (select count(*)::integer from avisos a where a.autor_id = p.id),
      (select count(*)::integer from avisos a where a.autor_id = p.id and a.status = 'aprobado'),
      (select count(*)::integer from respuestas_foro r where r.autor_id = p.id),
      (select count(*)::integer from emprendimientos e where e.dueno_id = p.id)
    from perfiles p
    left join auth.users u on u.id = p.id
    order by p.creado_en desc;
end $$;

-- ── Una cuenta suspendida no publica ───────────────────────────────────────
-- banned_until ya le cierra el ingreso, pero si tuviera una sesión abierta de
-- antes el token sigue siendo válido hasta que caduque. Esto lo corta igual.

create or replace function cuenta_activa()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from perfiles where id = auth.uid() and not suspendido);
$$;

drop policy if exists "publicar aviso propio" on avisos;
create policy "publicar aviso propio" on avisos
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and cuenta_activa()
    and status = 'pendiente'
    and dias_vigencia between 1 and 5
  );

drop policy if exists "responder autenticado" on respuestas_foro;
create policy "responder autenticado" on respuestas_foro
  for insert to authenticated
  with check (autor_id = auth.uid() and cuenta_activa());

drop policy if exists "registrar emprendimiento" on emprendimientos;
create policy "registrar emprendimiento" on emprendimientos
  for insert to authenticated
  with check (dueno_id = auth.uid() and cuenta_activa() and status = 'pendiente');

-- ── Permisos ───────────────────────────────────────────────────────────────
-- Las funciones comprueban es_admin() por dentro, pero igual no se ofrecen a
-- cualquiera: una capa no quita la otra.

revoke execute on function borrar_contenido_usuario(uuid) from public;
revoke execute on function suspender_cuenta(uuid, text) from public;
revoke execute on function reactivar_cuenta(uuid) from public;
revoke execute on function eliminar_cuenta(uuid) from public;
revoke execute on function usuarios_panel() from public;
revoke execute on function cuenta_activa() from public;

grant execute on function suspender_cuenta(uuid, text) to authenticated;
grant execute on function reactivar_cuenta(uuid) to authenticated;
grant execute on function eliminar_cuenta(uuid) to authenticated;
grant execute on function usuarios_panel() to authenticated;
grant execute on function cuenta_activa() to authenticated;

-- ── Después de ejecutar esto ───────────────────────────────────────────────
--
-- La pestaña "Cuentas" aparece en /adminfeucn para los perfiles con rol admin.
-- Los moderadores ven el resto del panel pero no esta pestaña: suspender y
-- eliminar son decisiones de la mesa directiva.
