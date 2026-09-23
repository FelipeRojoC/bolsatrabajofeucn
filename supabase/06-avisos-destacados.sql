-- ============================================================================
-- Avisos destacados de emprendimiento — ejecutar DESPUÉS de 05-gestion-usuarios
--
-- SQL Editor → New query → pegar todo → Run. Se puede repetir sin romper nada.
--
-- La administración enlaza un emprendimiento con el correo de un estudiante.
-- Desde ese momento, esa persona puede marcar sus avisos como destacados y
-- salen con el marco de colores. Solo los planes pagados y con la suscripción
-- al día: es lo que se está pagando.
-- ============================================================================

-- ── Columnas ───────────────────────────────────────────────────────────────

alter table avisos add column if not exists destacado boolean not null default false;
alter table avisos add column if not exists emprendimiento_id uuid references emprendimientos on delete set null;

create index if not exists avisos_destacados_idx on avisos (destacado) where destacado;

-- Nadie se destaca solo desde el cliente: lo decide el trigger de más abajo.
revoke update (destacado) on avisos from authenticated, anon;

-- ── ¿Quién puede destacar? ─────────────────────────────────────────────────
-- Plan pagado, ficha aprobada y suscripción vigente. Las tres cosas.

create or replace function emprendimiento_activo(p_usuario uuid)
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select e.id
    from emprendimientos e
   where e.dueno_id = p_usuario
     and e.status = 'aprobado'
     and e.plan in ('emprendedor', 'pro')
     and (e.suscripcion_hasta is null or e.suscripcion_hasta > now())
   order by case e.plan when 'pro' then 0 else 1 end
   limit 1;
$$;

/** Lo que consulta el formulario para habilitar o no la casilla. */
create or replace function mi_emprendimiento_destacable()
returns table (id uuid, nombre text, plan plan_emprendimiento, suscripcion_hasta timestamptz)
language sql
stable
security definer set search_path = public
as $$
  select e.id, e.nombre, e.plan, e.suscripcion_hasta
    from emprendimientos e
   where e.id = emprendimiento_activo(auth.uid());
$$;

-- ── Al publicar ────────────────────────────────────────────────────────────
-- Se comprueba en el servidor, no al pintar el formulario: entre que alguien
-- abre la página y envía el aviso, la suscripción puede haber vencido.

create or replace function resolver_destacado()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  emp uuid;
begin
  emp := emprendimiento_activo(coalesce(new.autor_id, auth.uid()));

  if new.destacado and emp is null then
    -- Se apaga en silencio en vez de rechazar el aviso: la publicación es lo
    -- importante, el marco es un extra.
    new.destacado := false;
    new.emprendimiento_id := null;
  elsif new.destacado then
    new.emprendimiento_id := emp;
  else
    new.emprendimiento_id := null;
  end if;

  return new;
end $$;

drop trigger if exists al_publicar_destacado on avisos;
create trigger al_publicar_destacado
  before insert on avisos
  for each row execute function resolver_destacado();

-- El trigger de 02-seguridad ya congela el resto de los campos en cada
-- edición; esto le suma que el autor tampoco se destaque después.
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
  new.destacado      := old.destacado;
  new.emprendimiento_id := old.emprendimiento_id;

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

  if not renovacion and new.expira_en is distinct from old.expira_en then
    new.expira_en := old.expira_en;
  end if;

  if new.dias_vigencia is distinct from old.dias_vigencia then
    new.dias_vigencia := old.dias_vigencia;
  end if;

  return new;
end $$;

-- ── Cuando la suscripción vence, el marco se apaga ─────────────────────────
-- Se engancha al mismo cron que ya despublica los avisos vencidos.

create or replace function expirar_avisos()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  n integer;
begin
  update avisos
     set status = 'expirado'
   where status = 'aprobado' and expira_en <= now();
  get diagnostics n = row_count;

  -- Deja de pagar, deja de destacar.
  update avisos a
     set destacado = false
   where a.destacado
     and not exists (
       select 1 from emprendimientos e
        where e.id = a.emprendimiento_id
          and e.status = 'aprobado'
          and e.plan in ('emprendedor', 'pro')
          and (e.suscripcion_hasta is null or e.suscripcion_hasta > now())
     );

  return n;
end $$;

-- ── Enlazar un emprendimiento con una cuenta ───────────────────────────────
-- La administración lo hace por correo, que es el dato que maneja: la persona
-- ya tiene cuenta y esto le cuelga el emprendimiento.

create or replace function enlazar_emprendimiento(p_emprendimiento uuid, p_correo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  perfil record;
  emp record;
begin
  if not es_admin() then
    raise exception 'Solo el equipo puede enlazar emprendimientos';
  end if;

  select id, nombre, correo, suspendido into perfil
    from perfiles where correo = lower(trim(p_correo));

  if perfil.id is null then
    raise exception 'No hay ninguna cuenta registrada con ese correo. La persona tiene que crear su cuenta primero.';
  end if;
  if perfil.suspendido then
    raise exception 'Esa cuenta está suspendida';
  end if;

  select id, nombre into emp from emprendimientos where id = p_emprendimiento;
  if emp.id is null then
    raise exception 'Ese emprendimiento ya no existe';
  end if;

  update emprendimientos
     set dueno_id = perfil.id,
         dueno = perfil.nombre,
         carrera = coalesce((select carrera from perfiles where id = perfil.id), carrera)
   where id = p_emprendimiento;

  return jsonb_build_object('usuario', perfil.nombre, 'correo', perfil.correo, 'emprendimiento', emp.nombre);
end $$;

create or replace function desenlazar_emprendimiento(p_emprendimiento uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'Solo el equipo puede desenlazar emprendimientos';
  end if;

  -- Sin dueño no hay quién destaque: los avisos vuelven a la fila común.
  update avisos set destacado = false where emprendimiento_id = p_emprendimiento;
  update emprendimientos set dueno_id = null where id = p_emprendimiento;
end $$;

-- ── Permisos ───────────────────────────────────────────────────────────────

revoke execute on function emprendimiento_activo(uuid) from public;
revoke execute on function resolver_destacado() from public;
revoke execute on function mi_emprendimiento_destacable() from public;
revoke execute on function enlazar_emprendimiento(uuid, text) from public;
revoke execute on function desenlazar_emprendimiento(uuid) from public;

grant execute on function mi_emprendimiento_destacable() to authenticated;
grant execute on function enlazar_emprendimiento(uuid, text) to authenticated;
grant execute on function desenlazar_emprendimiento(uuid) to authenticated;

-- ── Después de ejecutar esto ───────────────────────────────────────────────
--
-- En /adminfeucn → Emprendimientos, cada ficha trae un campo para escribir el
-- correo de quien la lleva. Enlazado y con plan Emprendedor o Pro al día, a esa
-- persona le aparece la casilla "Destacar este aviso" al publicar.
