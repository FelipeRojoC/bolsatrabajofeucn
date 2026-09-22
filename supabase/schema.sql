-- ============================================================================
-- Bolsa de Trabajo FEUCN — esquema de base de datos
--
-- Cómo usarlo:
--   1. Entra a tu proyecto en supabase.com
--   2. Menú lateral → SQL Editor → New query
--   3. Pega este archivo completo y pulsa "Run"
--
-- Se puede volver a ejecutar sin romper nada: todo está escrito con
-- IF NOT EXISTS y DROP POLICY IF EXISTS.
-- ============================================================================

-- ── Tipos ───────────────────────────────────────────────────────────────────

do $$ begin
  create type tipo_aviso as enum ('trabajo', 'venta', 'perdido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_aviso as enum ('pendiente', 'aprobado', 'rechazado', 'expirado', 'archivado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_lugar as enum ('campus', 'fuera');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rol_usuario as enum ('estudiante', 'moderador', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_emprendimiento as enum ('vitrina', 'emprendedor', 'pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_feria as enum ('borrador', 'abierta', 'cerrada', 'finalizada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_postulacion as enum ('recibida', 'seleccionada', 'no-seleccionada');
exception when duplicate_object then null; end $$;

-- ── Perfiles ────────────────────────────────────────────────────────────────
-- Una fila por cuenta de auth.users. Las cuentas del equipo se crean desde el
-- panel de Supabase (Authentication → Users), nunca desde el frontend.

create table if not exists perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  correo text not null unique,
  carrera text,
  rol rol_usuario not null default 'estudiante',
  avatar text not null default '#0b7a54',
  creado_en timestamptz not null default now()
);

-- Al registrarse alguien, se le crea el perfil solo.
create or replace function crear_perfil_nuevo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into perfiles (id, nombre, correo, carrera)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'carrera'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function crear_perfil_nuevo();

-- Helper usado por todas las políticas. SECURITY DEFINER para que no dependa
-- de que quien consulta pueda leer la tabla de perfiles.
create or replace function es_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and rol in ('admin', 'moderador')
  );
$$;

-- ── Avisos ──────────────────────────────────────────────────────────────────

create table if not exists avisos (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_aviso not null,
  titulo text not null check (char_length(titulo) between 8 and 90),
  descripcion text not null check (char_length(descripcion) >= 30),
  precio integer check (precio >= 0),
  precio_nota text,
  categoria text not null,
  estado_articulo text,
  imagenes text[] not null default '{}',

  lugar_tipo tipo_lugar not null default 'campus',
  lugar_zona text not null,
  lugar_referencia text,
  lat double precision not null,
  lng double precision not null,

  contacto_nombre text not null,
  contacto_carrera text not null,
  contacto_correo text not null,
  contacto_whatsapp text,
  contacto_instagram text,
  contacto_preferido text not null default 'whatsapp',

  autor_id uuid references perfiles on delete set null,
  creado_en timestamptz not null default now(),
  publicado_en timestamptz,
  expira_en timestamptz,
  -- Regla dura del reglamento: un aviso nunca dura más de 5 días.
  dias_vigencia smallint not null default 5 check (dias_vigencia between 1 and 5),
  renovaciones smallint not null default 0 check (renovaciones <= 1),

  status estado_aviso not null default 'pendiente',
  moderado_por text,
  moderado_en timestamptz,
  motivo_rechazo text,
  nota_moderacion text,

  vistas integer not null default 0,
  clics_contacto integer not null default 0,
  guardados integer not null default 0,
  compartidos integer not null default 0,

  riesgo smallint not null default 0,
  banderas text[] not null default '{}',

  lost_kind text check (lost_kind in ('perdido', 'encontrado')),
  resuelto boolean not null default false
);

create index if not exists avisos_status_idx on avisos (status, publicado_en desc);
create index if not exists avisos_tipo_idx on avisos (tipo, status);
create index if not exists avisos_expira_idx on avisos (expira_en) where status = 'aprobado';
create index if not exists avisos_autor_idx on avisos (autor_id);

create table if not exists respuestas_foro (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references avisos on delete cascade,
  autor_id uuid references perfiles on delete set null,
  autor_nombre text not null,
  autor_carrera text,
  mensaje text not null check (char_length(mensaje) between 2 and 1000),
  creado_en timestamptz not null default now()
);

create index if not exists respuestas_aviso_idx on respuestas_foro (aviso_id, creado_en);

-- ── Analítica ───────────────────────────────────────────────────────────────
-- Tabla de solo-inserción: nunca se guarda quién hizo cada clic, solo que
-- ocurrió. Las estadísticas son del aviso, no de las personas.

create table if not exists eventos (
  id bigserial primary key,
  kind text not null check (kind in ('vista', 'clic-contacto', 'guardado', 'compartido', 'publicacion')),
  target_id uuid not null,
  target_type text not null check (target_type in ('post', 'emprendimiento')),
  post_type tipo_aviso,
  at timestamptz not null default now()
);

create index if not exists eventos_at_idx on eventos (at desc);
create index if not exists eventos_target_idx on eventos (target_id, kind);

create table if not exists reportes (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references avisos on delete cascade,
  motivo text not null,
  detalle text,
  reportado_por uuid references perfiles on delete set null,
  creado_en timestamptz not null default now(),
  resuelto boolean not null default false
);

create index if not exists reportes_abiertos_idx on reportes (resuelto, creado_en desc);

-- ── Emprendimientos ─────────────────────────────────────────────────────────

create table if not exists emprendimientos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  lema text not null,
  descripcion text not null,
  rubro text not null,
  logo text not null default '#0b7a54',
  portada text,
  instagram text,
  tiktok text,
  web text,
  whatsapp text,
  dueno_id uuid references perfiles on delete set null,
  dueno text not null,
  carrera text not null,
  plan plan_emprendimiento not null default 'vitrina',
  suscripcion_hasta timestamptz,
  status estado_aviso not null default 'pendiente',
  creado_en timestamptz not null default now(),
  vistas integer not null default 0,
  clics_contacto integer not null default 0,
  catalogo jsonb not null default '[]'::jsonb
);

create table if not exists solicitudes_plan (
  id uuid primary key default gen_random_uuid(),
  emprendimiento_id uuid not null references emprendimientos on delete cascade,
  plan plan_emprendimiento not null,
  solicitante_id uuid references perfiles on delete set null,
  solicitante text not null,
  correo text not null,
  meses smallint not null check (meses > 0),
  creado_en timestamptz not null default now(),
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmada', 'rechazada')),
  nota text
);

-- ── Ferias ──────────────────────────────────────────────────────────────────

create table if not exists ferias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text not null,
  fecha timestamptz not null,
  lugar text not null,
  cupos integer not null check (cupos > 0),
  puestos integer not null check (puestos > 0),
  monto_inscripcion integer not null default 1000 check (monto_inscripcion >= 0),
  pide_alimento boolean not null default true,
  estado estado_feria not null default 'borrador',
  abierta_desde timestamptz,
  cerrada_en timestamptz,
  creado_en timestamptz not null default now()
);

create table if not exists postulaciones_feria (
  id uuid primary key default gen_random_uuid(),
  feria_id uuid not null references ferias on delete cascade,
  nombre_completo text not null,
  correo text not null,
  carrera text not null,
  rut text not null,
  avance_curricular smallint not null check (avance_curricular between 0 and 100),
  nombre_emprendimiento text not null,
  descripcion_breve text not null,
  es_mapau boolean not null default false,
  acepta_condiciones boolean not null default false check (acepta_condiciones),
  creado_en timestamptz not null default now(),
  estado estado_postulacion not null default 'recibida',
  puesto smallint,
  pago_inscripcion boolean not null default false,
  entrega_alimento boolean not null default false,
  avisado_en timestamptz,
  -- Una postulación por RUT y por feria.
  unique (feria_id, rut)
);

create index if not exists postulaciones_feria_idx on postulaciones_feria (feria_id, estado);

-- Dos emprendimientos no pueden quedar en el mismo puesto de la misma feria.
create unique index if not exists postulaciones_puesto_unico
  on postulaciones_feria (feria_id, puesto)
  where puesto is not null;

-- ── Automatizaciones ────────────────────────────────────────────────────────

-- Al llegar al cupo, la convocatoria se cierra sola.
create or replace function cerrar_feria_si_llena()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  total integer;
  tope integer;
begin
  select count(*) into total from postulaciones_feria where feria_id = new.feria_id;
  select cupos into tope from ferias where id = new.feria_id;

  if total >= tope then
    update ferias
       set estado = 'cerrada', cerrada_en = now()
     where id = new.feria_id and estado = 'abierta';
  end if;
  return new;
end $$;

drop trigger if exists al_postular on postulaciones_feria;
create trigger al_postular
  after insert on postulaciones_feria
  for each row execute function cerrar_feria_si_llena();

-- No se aceptan postulaciones con la convocatoria cerrada.
create or replace function verificar_feria_abierta()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  st estado_feria;
begin
  select estado into st from ferias where id = new.feria_id;
  if st is distinct from 'abierta' then
    raise exception 'La convocatoria de esta feria no está abierta';
  end if;
  return new;
end $$;

drop trigger if exists antes_de_postular on postulaciones_feria;
create trigger antes_de_postular
  before insert on postulaciones_feria
  for each row execute function verificar_feria_abierta();

-- Los avisos vencidos se despublican solos. Llamar desde un cron cada 10 min:
--   Dashboard → Database → Cron Jobs → select expirar_avisos();
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
  return n;
end $$;

-- Contadores de la tarjeta, actualizados por cada evento.
create or replace function registrar_evento(
  p_kind text,
  p_target_id uuid,
  p_target_type text default 'post'
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into eventos (kind, target_id, target_type, post_type)
  values (
    p_kind,
    p_target_id,
    p_target_type,
    (select tipo from avisos where id = p_target_id)
  );

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

-- ============================================================================
-- Seguridad a nivel de fila (RLS)
--
-- Sin esto, cualquiera con la clave pública del proyecto puede leer y escribir
-- todas las tablas. La clave anon del frontend ES pública por diseño: lo que
-- protege los datos son estas políticas.
-- ============================================================================

alter table perfiles             enable row level security;
alter table avisos               enable row level security;
alter table respuestas_foro      enable row level security;
alter table eventos              enable row level security;
alter table reportes             enable row level security;
alter table emprendimientos      enable row level security;
alter table solicitudes_plan     enable row level security;
alter table ferias               enable row level security;
alter table postulaciones_feria  enable row level security;

-- Perfiles ------------------------------------------------------------------
drop policy if exists "perfil propio visible" on perfiles;
create policy "perfil propio visible" on perfiles
  for select using (auth.uid() = id or es_admin());

drop policy if exists "editar perfil propio" on perfiles;
create policy "editar perfil propio" on perfiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Avisos --------------------------------------------------------------------
drop policy if exists "avisos publicados visibles" on avisos;
create policy "avisos publicados visibles" on avisos
  for select using (
    status in ('aprobado', 'expirado', 'archivado')
    or autor_id = auth.uid()
    or es_admin()
  );

drop policy if exists "publicar aviso propio" on avisos;
create policy "publicar aviso propio" on avisos
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    -- Nadie se autopublica: todo aviso nace pendiente de revisión.
    and status = 'pendiente'
    and dias_vigencia between 1 and 5
  );

drop policy if exists "editar aviso propio" on avisos;
create policy "editar aviso propio" on avisos
  for update using (autor_id = auth.uid() or es_admin())
  with check (
    es_admin()
    -- El autor puede cerrar su aviso, no aprobarlo.
    or (autor_id = auth.uid() and status in ('pendiente', 'archivado'))
  );

drop policy if exists "borrar aviso propio" on avisos;
create policy "borrar aviso propio" on avisos
  for delete using (autor_id = auth.uid() or es_admin());

-- Respuestas del foro -------------------------------------------------------
drop policy if exists "respuestas visibles" on respuestas_foro;
create policy "respuestas visibles" on respuestas_foro for select using (true);

drop policy if exists "responder autenticado" on respuestas_foro;
create policy "responder autenticado" on respuestas_foro
  for insert to authenticated with check (autor_id = auth.uid());

drop policy if exists "moderar respuestas" on respuestas_foro;
create policy "moderar respuestas" on respuestas_foro for delete using (es_admin());

-- Eventos -------------------------------------------------------------------
-- Se insertan por la función registrar_evento; leer el detalle es solo del
-- equipo, porque el agregado ya viaja en los contadores del aviso.
drop policy if exists "solo el equipo lee eventos" on eventos;
create policy "solo el equipo lee eventos" on eventos for select using (es_admin());

-- Reportes ------------------------------------------------------------------
drop policy if exists "reportar" on reportes;
create policy "reportar" on reportes for insert with check (true);

drop policy if exists "leer reportes" on reportes;
create policy "leer reportes" on reportes for select using (es_admin());

drop policy if exists "resolver reportes" on reportes;
create policy "resolver reportes" on reportes for update using (es_admin());

-- Emprendimientos -----------------------------------------------------------
drop policy if exists "directorio publico" on emprendimientos;
create policy "directorio publico" on emprendimientos
  for select using (status = 'aprobado' or dueno_id = auth.uid() or es_admin());

drop policy if exists "registrar emprendimiento" on emprendimientos;
create policy "registrar emprendimiento" on emprendimientos
  for insert to authenticated with check (dueno_id = auth.uid() and status = 'pendiente');

drop policy if exists "editar emprendimiento" on emprendimientos;
create policy "editar emprendimiento" on emprendimientos
  for update using (dueno_id = auth.uid() or es_admin())
  with check (es_admin() or (dueno_id = auth.uid() and status = 'pendiente'));

-- Solicitudes de plan -------------------------------------------------------
drop policy if exists "solicitar plan" on solicitudes_plan;
create policy "solicitar plan" on solicitudes_plan
  for insert to authenticated with check (solicitante_id = auth.uid());

drop policy if exists "ver solicitudes propias" on solicitudes_plan;
create policy "ver solicitudes propias" on solicitudes_plan
  for select using (solicitante_id = auth.uid() or es_admin());

drop policy if exists "resolver solicitudes" on solicitudes_plan;
create policy "resolver solicitudes" on solicitudes_plan for update using (es_admin());

-- Ferias --------------------------------------------------------------------
drop policy if exists "ferias publicas" on ferias;
create policy "ferias publicas" on ferias
  for select using (estado <> 'borrador' or es_admin());

drop policy if exists "administrar ferias" on ferias;
create policy "administrar ferias" on ferias for all using (es_admin()) with check (es_admin());

-- Postulaciones -------------------------------------------------------------
-- Cualquiera puede postular, pero la lista es privada: tiene RUT y correo de
-- estudiantes. Solo el equipo la ve.
drop policy if exists "postular a feria" on postulaciones_feria;
create policy "postular a feria" on postulaciones_feria
  for insert with check (acepta_condiciones and estado = 'recibida' and puesto is null);

drop policy if exists "solo el equipo ve postulaciones" on postulaciones_feria;
create policy "solo el equipo ve postulaciones" on postulaciones_feria
  for select using (es_admin());

drop policy if exists "administrar postulaciones" on postulaciones_feria;
create policy "administrar postulaciones" on postulaciones_feria
  for update using (es_admin()) with check (es_admin());

drop policy if exists "borrar postulaciones" on postulaciones_feria;
create policy "borrar postulaciones" on postulaciones_feria for delete using (es_admin());

-- ── Después de ejecutar esto ───────────────────────────────────────────────
-- 1. Authentication → Users → Add user: crea la cuenta del equipo.
-- 2. Copia su UUID y ejecuta:
--      update perfiles set rol = 'admin' where correo = 'admin@feucn.cl';
-- 3. Database → Cron Jobs → nuevo job cada 10 minutos: select expirar_avisos();
