-- ============================================================================
-- Cuentas de estudiantes — ejecutar DESPUÉS de 02-seguridad.sql
--
-- SQL Editor → New query → pegar todo → Run. Se puede repetir sin romper nada.
--
-- Deja que los estudiantes se registren solos, pero únicamente con correo
-- institucional. La comprobación vive acá y no en el navegador: quien quiera
-- saltarse el formulario y hablarle directo a la API se topa con esto igual.
-- ============================================================================

-- ── Dominios aceptados ─────────────────────────────────────────────────────
-- Para agregar o quitar uno, se edita esta función y se vuelve a ejecutar.

create or replace function correo_institucional(p_correo text)
returns boolean
language sql
immutable
as $$
  select lower(trim(p_correo)) ~ '@(alumnos\.ucn\.cl|ce\.ucn\.cl|ucn\.cl|feucn\.cl)$';
$$;

-- ── Alta de cuenta ─────────────────────────────────────────────────────────
-- Se reemplaza el trigger de schema.sql para sumar la validación de dominio y
-- guardar el nombre y la carrera que vienen del formulario de registro.

create or replace function crear_perfil_nuevo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not correo_institucional(new.email) then
    raise exception 'Solo se puede crear una cuenta con un correo institucional UCN'
      using errcode = 'check_violation';
  end if;

  insert into perfiles (id, nombre, correo, carrera, rol)
  values (
    new.id,
    -- El nombre viene del formulario; si no, se arma con la parte del correo.
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
      initcap(replace(split_part(new.email, '@', 1), '.', ' '))
    ),
    lower(new.email),
    nullif(trim(new.raw_user_meta_data ->> 'carrera'), ''),
    -- Nadie nace con permisos: el rol se asigna después con asignar_rol().
    'estudiante'
  )
  on conflict (id) do nothing;

  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function crear_perfil_nuevo();

revoke execute on function crear_perfil_nuevo() from public;
revoke execute on function correo_institucional(text) from public;
grant execute on function correo_institucional(text) to anon, authenticated;

-- ── El nombre y la carrera se pueden corregir; el correo no ────────────────
-- El correo es la identidad de la cuenta y vive en auth.users. Si se pudiera
-- editar en perfiles, las dos tablas quedarían diciendo cosas distintas.

create or replace function proteger_correo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.correo is distinct from old.correo and not es_admin() then
    raise exception 'El correo de la cuenta no se puede cambiar desde el perfil';
  end if;
  return new;
end $$;

drop trigger if exists no_cambiar_correo on perfiles;
create trigger no_cambiar_correo
  before update on perfiles
  for each row execute function proteger_correo();

revoke execute on function proteger_correo() from public;

-- ── Publicar exige cuenta con correo institucional ─────────────────────────
-- La política de avisos ya pedía estar autenticado. Esto agrega que el autor
-- sea quien dice ser y que su perfil exista de verdad.

drop policy if exists "publicar aviso propio" on avisos;
create policy "publicar aviso propio" on avisos
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (select 1 from perfiles where id = auth.uid())
    -- Nadie se autopublica: todo aviso nace pendiente de revisión.
    and status = 'pendiente'
    and dias_vigencia between 1 and 5
  );

-- ── Después de ejecutar esto ───────────────────────────────────────────────
--
-- Authentication → Providers → Email, y decide una de las dos:
--
--   a) "Confirm email" ACTIVADO (recomendado para el sitio en público).
--      Cada registro recibe un correo con un enlace. Ojo: el servidor de
--      correo que trae Supabase gratis manda muy pocos mensajes por hora y
--      solo a direcciones del propio equipo. Para abrirlo a todos hay que
--      configurar SMTP propio en Authentication → Emails (Resend, por
--      ejemplo, el mismo que usan los correos de la feria).
--
--   b) "Confirm email" DESACTIVADO (cómodo para probar ahora).
--      La cuenta queda usable al instante, sin correo de por medio. El filtro
--      de dominio sigue en pie, así que no entra cualquiera igual.
