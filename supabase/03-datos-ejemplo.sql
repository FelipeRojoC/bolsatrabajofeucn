-- ============================================================================
-- Datos de ejemplo — OPCIONAL
--
-- La base arranca vacía, así que el sitio se ve sin nada hasta que alguien
-- publique. Esto carga una feria abierta y unos avisos para poder recorrer la
-- aplicación con contenido.
--
-- Para borrarlos después:
--   delete from avisos where titulo like '[ejemplo]%';
--   delete from ferias where nombre like '[ejemplo]%';
-- ============================================================================

insert into ferias (nombre, descripcion, fecha, lugar, cupos, puestos, monto_inscripcion, pide_alimento, estado, abierta_desde)
values (
  '[ejemplo] Feria de Emprendimientos FEUCN — Primavera',
  E'Tres días de feria en el patio del campus para que los emprendimientos de la comunidad UCN vendan y se den a conocer. Cada seleccionado recibe un puesto con mesa y silla.\n\nEl aporte de inscripción y el alimento no perecible se entregan en la oficina de la federación antes del evento.',
  now() + interval '21 days',
  'Patio de las banderas, Campus Central',
  40, 24, 1000, true, 'abierta', now() - interval '6 days'
);

insert into avisos (
  tipo, titulo, descripcion, precio, precio_nota, categoria, estado_articulo,
  lugar_tipo, lugar_zona, lat, lng,
  contacto_nombre, contacto_carrera, contacto_correo, contacto_whatsapp, contacto_preferido,
  status, publicado_en, expira_en, dias_vigencia
)
values
  ('venta', '[ejemplo] Calculadora Casio fx-991LA CX — como nueva',
   E'La usé un semestre y me cambié a otra carrera. Funciona perfecto, viene con la tapa y el manual. Ideal para los primeros años de ingeniería.\n\nLa entrego en la entrada del campus entre clases, cualquier día entre 13:00 y 14:00.',
   22000, null, 'Tecnología', 'como-nuevo',
   'campus', 'Entrada principal', -23.6844, -70.4115,
   'Ignacio Tapia', 'Ingeniería Civil de Minas', 'ignacio.tapia@alumnos.ucn.cl', '+56912345678', 'whatsapp',
   'aprobado', now() - interval '3 hours', now() + interval '4 days 21 hours', 5),

  ('trabajo', '[ejemplo] Ayudantía de Cálculo I y II — presencial o por Meet',
   E'Estudiante de cuarto año de Civil Industrial. Hago ayudantías de Cálculo I y II, enfocadas en preparar certámenes. Trabajo con guías de años anteriores y resolvemos ejercicios tipo prueba.\n\nSesiones de 90 minutos, individuales o en grupos de hasta 4.',
   8000, 'por hora', 'Ayudantía', null,
   'campus', 'Biblioteca central', -23.6846, -70.4112,
   'Javiera Rojas', 'Ingeniería Civil Industrial', 'javiera.rojas@alumnos.ucn.cl', '+56987654321', 'whatsapp',
   'aprobado', now() - interval '9 hours', now() + interval '4 days 15 hours', 5),

  ('trabajo', '[ejemplo] Se necesitan 4 garzones para matrimonio — sábado, turno noche',
   E'Empresa de banquetería de Antofagasta busca apoyo para un evento el sábado 18:00 a 02:00. No se necesita experiencia previa, se hace inducción a las 17:00.\n\nPago el mismo día al terminar el turno.',
   45000, 'por turno', 'Eventos y producción', null,
   'fuera', 'A coordinar por mensaje', -23.6509, -70.3975,
   'Sebastián Núñez', 'Ingeniería Comercial', 'sebastian.nunez@alumnos.ucn.cl', '+56911223344', 'whatsapp',
   'aprobado', now() - interval '5 hours', now() + interval '4 days 19 hours', 5),

  ('venta', '[ejemplo] Bicicleta aro 29 — perfecta para venir al campus',
   E'Bicicleta de montaña aro 29, 21 cambios, frenos de disco delanteros. La usé un año para moverme entre la casa y el campus. Le acabo de poner cámaras nuevas.\n\nIncluye candado en U y luz trasera. Se prueba antes de cualquier trato.',
   130000, null, 'Bicicletas y movilidad', 'usado',
   'campus', 'Estacionamiento', -23.6841, -70.4119,
   'Camila Araya', 'Arquitectura', 'camila.araya@alumnos.ucn.cl', '+56955667788', 'correo',
   'aprobado', now() - interval '30 hours', now() + interval '3 days 18 hours', 5),

  ('perdido', '[ejemplo] Encontré una TNE a nombre de "M. Rivera" en el casino',
   E'Estaba sobre una mesa del casino el jueves como a las 14:30. La dejé en la oficina de la FEUCN para que la retire su dueño.\n\nSi eres tú, pasa con tu cédula. No publico el RUT por seguridad.',
   null, null, 'Documentos y TNE', null,
   'campus', 'Casino', -23.6847, -70.4110,
   'Fernanda Muñoz', 'Psicología', 'fernanda.munoz@alumnos.ucn.cl', null, 'correo',
   'aprobado', now() - interval '18 hours', now() + interval '4 days 6 hours', 5),

  ('perdido', '[ejemplo] Perdí el cargador de mi notebook en el Edificio Y',
   E'Es un cargador de notebook Lenovo, negro, con el cable enrollado con un elástico rojo. Lo dejé enchufado en una sala del Edificio Y el lunes en la tarde.\n\nSi alguien lo desenchufó pensando que era suyo, no hay problema: solo avísenme por acá.',
   null, null, 'Tecnología', null,
   'campus', 'Edificio Y', -23.6843, -70.4117,
   'Diego Cortés', 'Derecho', 'diego.cortes@alumnos.ucn.cl', '+56933445566', 'whatsapp',
   'aprobado', now() - interval '22 hours', now() + interval '4 days 2 hours', 5);

update avisos set lost_kind = 'encontrado' where titulo like '[ejemplo]%' and titulo like '%Encontré%';
update avisos set lost_kind = 'perdido'    where titulo like '[ejemplo]%' and titulo like '%Perdí%';

insert into emprendimientos (nombre, lema, descripcion, rubro, logo, instagram, dueno, carrera, plan, status, suscripcion_hasta, catalogo)
values (
  '[ejemplo] Dulce Norte',
  'Tortas y kuchen hechos entre certámenes',
  E'Repostería casera hecha por dos estudiantes de Enfermería. Partimos vendiendo brownies en los pasillos para costear la carrera y hoy tomamos pedidos de tortas completas.\n\nTrabajamos con pedido anticipado de 48 horas. Tenemos opciones sin azúcar y sin lactosa.',
  'Comida y repostería', '#e87ba4', 'dulcenorte.ucn',
  'Valentina Soto', 'Enfermería', 'pro', 'aprobado', now() + interval '26 days',
  '[{"titulo":"Torta de 20 personas","precio":28000},{"titulo":"Caja de 12 brownies","precio":9000}]'::jsonb
);
