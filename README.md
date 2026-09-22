# Bolsa UCN — FEUCN

Frontend de la bolsa de trabajo, compraventa y emprendimientos de la comunidad
UCN, pensada para ser administrada por la Federación de Estudiantes.

Es una aplicación **solo de frontend**: toda la persistencia vive hoy en
`localStorage` detrás de una capa de datos con la misma forma que tendría contra
una API real, así que conectar el backend es reemplazar cuerpos de funciones,
no reescribir componentes.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # bundle de producción en dist/
```

---

## Qué hace

| Sección | Ruta | Qué resuelve |
|---|---|---|
| Portada | `/` | Entrada, búsqueda, avisos por vencer y recién publicados |
| Avisos | `/avisos` | Feed de trabajos y compraventa, con filtros, orden y vista de mapa |
| ¿Se perdió esto? | `/perdidos` | Foro de objetos perdidos y encontrados, con hilo de respuestas |
| Emprendimientos | `/emprendimientos` | Directorio de negocios de estudiantes, con fichas por plan |
| Feria | `/feria` | Convocatoria abierta y formulario de postulación |
| Planes | `/planes` | Planes mensuales del directorio y transparencia del gasto |
| Publicar | `/publicar` | Asistente de 4 pasos con vista previa en vivo |
| Mis avisos | `/mis-avisos` | Métricas por aviso, renovación y guardados |
| Estadísticas | `/estadisticas` | Panel público de uso de la plataforma |
| La FEUCN | `/feucn` | Quiénes son, reglamento de la bolsa, contacto y oficina |
| Ingreso | `/admin` | Acceso del equipo con usuario y contraseña |
| Panel | `/moderacion` | Cola por riesgo, reportes, altas, suscripciones y ferias |

### Las reglas que definen el producto

- **Sin transacciones.** No hay carrito, pasarela ni comisión. La plataforma
  entrega un contacto y ahí termina su rol. Esto está dicho explícitamente en la
  portada, en el formulario, en el detalle de cada aviso y en los planes.
- **Vigencia de 5 días.** Un aviso aprobado vive como máximo
  `MAX_DIAS_VIGENCIA` días y se despublica solo. El autor puede renovarlo **una
  vez** (`MAX_RENOVACIONES`). El barrido corre al abrir la app y cada minuto.
- **El clic al contacto es la métrica.** Las visitas se cuentan una vez por
  apertura del detalle; el contacto solo se muestra al pulsar, y ese pulso es lo
  que se mide. Mirar es gratis; escribir revela intención real.
- **Todo aviso pasa por moderación**, con motivo por escrito si se rechaza.
- **Privacidad de las métricas.** Se guarda *cuántos* clics recibió un aviso,
  nunca *quién* los hizo.

---

## Ferias de emprendimiento

La federación arma ferias cada cierto tiempo. El módulo cubre el ciclo completo
sin planillas sueltas ni cadenas de WhatsApp:

1. **Se abre la convocatoria** desde el panel: se define el cupo de
   postulaciones, cuántos puestos hay, el aporte y si se pide alimento.
2. **La gente postula** en `/feria` con nombre completo, correo, carrera, RUT,
   avance curricular, nombre del emprendimiento y qué vende. El RUT se valida
   con su dígito verificador y se acepta una sola postulación por RUT.
3. **Al llegar al cupo, se cierra sola.** No hay que estar mirando el contador.
4. **Se selecciona** por orden de llegada con un botón, o una por una.
5. **Se reparten las mesas.** Los emprendimientos **MAPAU van primero** y toman
   los números más bajos, en el orden en que postularon; recién después se
   sortean las mesas restantes entre los demás, con Fisher-Yates. Si la
   federación ya le puso un número a alguien a mano, ese número se respeta y
   sale del bombo.
6. **Se avisa a los seleccionados.** Sin backend, el panel deja la lista de
   correos y el mensaje listos para pegar; con Supabase conectado, la Edge
   Function `avisar-seleccionados` los manda de verdad y marca quién recibió.
7. **Se descarga la planilla** en CSV, que Excel abre directo (separador `;` y
   BOM UTF-8, para que las tildes no salgan rotas).
8. **Se imprime la hoja de control**: una tabla por número de mesa con
   emprendimiento, responsable, RUT y dos columnas de firma — una por el aporte
   y otra por el alimento — para ir marcando en la entrada. Sale del diálogo de
   impresión del navegador, así que se guarda como PDF o se imprime directo.

El aporte y el alimento **no se cobran en el sitio**: se entregan en la oficina
de la federación y ahí se marcan en la lista.

---

## Acceso del equipo

El panel vive en `/moderacion` y se entra por `/admin` con el **correo y la
contraseña de una cuenta de Supabase** cuyo perfil tenga rol `admin` o
`moderador`. Desde ahí se aprueban y rechazan publicaciones, se ven los
reportes, y se gestionan las altas del directorio, las suscripciones y las
ferias.

Las cuentas se crean **solo** desde Supabase (Authentication → Users). El
frontend no puede crear ninguna, y el menú de "cambiar de cuenta" ofrece
únicamente perfiles de estudiante: al panel no se entra por ahí.

> Durante el desarrollo hubo una credencial escrita en `src/lib/auth.ts`. Se
> eliminó al conectar la base de datos. **Sigue estando en el historial de git**
> (commits `3efa868`, `2639dd5` y `00d331f`), así que esa contraseña no debe
> volver a usarse en ninguna cuenta.

---

## Arquitectura

```
src/
├── lib/
│   ├── types.ts        Modelo de dominio — contrato compartido con el backend
│   ├── constants.ts    Campus, categorías, planes, reglas, términos de riesgo
│   ├── api.ts          Capa de datos (hoy localStorage, mañana fetch)
│   ├── analytics.ts    Agregaciones para los gráficos (series, calor, embudo)
│   ├── seed.ts         Datos de demostración deterministas
│   ├── format.ts       Precios, fechas, cuenta regresiva, enlaces
│   ├── rut.ts          RUT chileno: formato y dígito verificador
│   ├── exportar.ts     Planilla CSV y hoja de control imprimible
│   ├── auth.ts         Credencial temporal del panel
│   ├── supabase.ts     Cliente, activo solo si hay variables de entorno
│   └── imagen.ts       Compresión de fotos en el navegador
├── state/AppProvider.tsx   Sesión, tema, avisos flotantes, refresco de datos
├── components/
│   ├── Graficos.tsx    Gráficos en SVG propio (sin librerías)
│   ├── Mapa.tsx        Envoltorio de Leaflet (selector y vista)
│   ├── TarjetaAviso.tsx · DetalleAviso.tsx · Layout.tsx · UI.tsx · Iconos.tsx
│   └── BuscadorRapido.tsx   Búsqueda global (Ctrl/Cmd + K)
├── pages/              Una por sección
└── styles/             tokens.css · base.css · componentes.css

supabase/
├── schema.sql          Tablas, triggers, funciones y políticas RLS
└── functions/
    └── avisar-seleccionados/   Edge Function que manda los correos
```

### Conectar Supabase

Todo lo que necesita la base está en `supabase/schema.sql`: tablas, índices,
triggers de automatización y las políticas de seguridad. Paso a paso:

**1. Crear el proyecto**
En [supabase.com](https://supabase.com) → *New project*. Anota la contraseña de
la base cuando te la pida. La región más cercana es *South America (São Paulo)*.

**2. Cargar el esquema**
Menú lateral → **SQL Editor** → *New query*. Pega y ejecuta, en este orden:

1. `supabase/schema.sql` — tablas, índices, triggers y políticas.
2. `supabase/02-seguridad.sql` — endurecimiento. **No es opcional**: corrige una
   escalada de privilegios que dejaba a cualquier cuenta nombrarse administradora.
3. `supabase/03-datos-ejemplo.sql` — opcional, carga una feria y unos avisos
   para recorrer el sitio con contenido. Se borra con dos `delete` que están
   comentados al principio del archivo.

Los tres se pueden volver a ejecutar sin romper nada.

**3. Conectar el frontend**
Project Settings → **API**. Copia `Project URL` y la clave `anon public`, y crea
un archivo `.env.local` en la raíz:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

La clave `anon` es pública por diseño; lo que protege los datos son las
políticas RLS. La `service_role` **nunca** va en el frontend.

**4. Crear la cuenta del equipo**
Authentication → **Users** → *Add user* con correo y contraseña. Después, en el
SQL Editor:

```sql
update perfiles set rol = 'admin' where correo = 'admin@feucn.cl';
```

Desde ese momento las cuentas se crean solo ahí, como querías.

**5. Programar el vencimiento de avisos**
Database → **Cron Jobs** → nuevo job cada 10 minutos con `select expirar_avisos();`
Así la regla de los 5 días se cumple aunque nadie abra el sitio.

**6. Correos de la feria (opcional)**
Crea una cuenta en [resend.com](https://resend.com), verifica el dominio de la
federación y despliega la función:

```bash
npx supabase functions deploy avisar-seleccionados
npx supabase secrets set RESEND_API_KEY=re_xxx CORREO_REMITENTE="FEUCN <feria@feucn.cl>"
```

### Cómo hablan la aplicación y la base

Las páginas leen de forma síncrona (`listarTodos()`, `listarFerias()`, …) y
Supabase es asíncrono. En vez de reescribir cada página con estados de carga, la
aplicación mantiene una **caché local que refleja la base**:

- Al abrir, y al volver a la pestaña, `sincronizar()` trae todo de Supabase y
  llena la caché. RLS decide qué llega: una visita anónima recibe los avisos
  publicados; el equipo recibe además la cola, los reportes y las postulaciones.
- Las escrituras van a Supabase y, al confirmarse, vuelven a sincronizar.
- Sin variables de entorno, la misma caché se llena con datos de demostración y
  la aplicación funciona igual, sin red.

Eso hace que lo local nunca sea la verdad cuando hay base: se descarta al
arrancar y se vuelve a llenar desde el servidor. Lo único que sigue siendo
propio del navegador son los avisos guardados con el corazón, que son una
comodidad de cada persona y no tienen por qué viajar.

### Seguridad

Lo que se cerró, y cómo comprobarlo:

| Vía de ataque | Qué se hizo |
|---|---|
| **Escalada de privilegios** | Un usuario con cuenta podía hacerse `admin` editando su propio perfil: RLS autoriza la fila, no la columna. Ahora un trigger lo impide y además se revocó el permiso de escritura sobre `rol`. Para nombrar moderadores está `asignar_rol()`. |
| **Falsear estadísticas** | El autor de un aviso podía escribir `vistas = 99999`, autopublicarse o estirar su vigencia. Un trigger restaura contadores, riesgo y fechas en cada edición que no venga del equipo. |
| **XSS por enlaces** | Un `javascript:` guardado en el sitio web de un emprendimiento se ejecutaba al pulsarlo. `urlSegura()` deja pasar solo `http`/`https`, y los handles de redes se validan contra una lista de caracteres. |
| **XSS en general** | La política de contenido bloquea cualquier script que no venga del propio origen. La hoja de control imprimible, que arma HTML a mano, escapa todos los campos de usuario. |
| **Clickjacking** | `frame-ancestors 'none'` y `X-Frame-Options: DENY`. |
| **Fuga de datos personales** | Las postulaciones traen RUT y correo: solo las lee el equipo. Los perfiles, solo su dueño. Los eventos de analítica nunca guardan quién hizo el clic. |
| **Basura en la base** | Límites de longitud en cada campo de texto, máximo de imágenes, RUT validado con dígito verificador en el servidor y correo validado por formato. |
| **Inflar contadores** | `registrar_evento()` comprueba que el aviso exista y esté publicado; escribir la tabla de eventos a mano quedó revocado. |
| **Ventanas robadas** | Todo enlace externo lleva `rel="noopener noreferrer"`. |
| **Dependencias** | `npm audit` en cero. |

Lo que **no** está cubierto y depende de la configuración del proyecto:

1. **Captcha en la postulación de ferias.** Postular no pide cuenta —así tiene
   que ser— pero eso deja abierto que un script genere RUT válidos y llene los
   cupos. Supabase trae hCaptcha y Turnstile en Authentication → Settings.
2. **Protección de contraseñas filtradas** — Authentication → Policies.
3. **Límite de intentos de ingreso** — Authentication → Rate limits.
4. **URLs de redirección** — Authentication → URL Configuration: deja solo el
   dominio real. Con un comodín, un atacante puede llevarse el token de sesión.

Ningún sistema es invulnerable; lo anterior cierra las vías que esta aplicación
tiene abiertas por su propia forma.

### Lo que sigue pendiente

1. **Autenticación de estudiantes.** El panel ya entra por Supabase Auth, pero
   publicar avisos todavía usa una sesión de demostración. Falta el registro con
   correo institucional para el resto del sitio.
2. **Tiles del mapa.** `MapaLeaflet.tsx` usa los tiles públicos de
   OpenStreetMap, que no cubren una aplicación con tráfico real. Hay que
   contratar un proveedor (MapTiler, Stadia, Mapbox). Si fallan, el mapa avisa
   y el punto igual queda guardado.
3. **Imágenes.** Hoy se guardan como data URL comprimidas; deberían ir a
   Supabase Storage y dejar en el aviso solo la URL.
4. **Correos de aprobación y rechazo** de avisos, igual que los de la feria.

---

## Decisiones de diseño

**Riesgo automático en la moderación.** Al enviar un aviso se calcula un puntaje
0–100 (`evaluarRiesgo`) a partir de términos del reglamento: pagos por
adelantado, productos restringidos, trabajos académicos resueltos, montos fuera
de escala. No bloquea nada — ordena la cola para que lo sospechoso se revise
primero, y el mismo aviso se le muestra al autor **antes** de publicar para que
pueda corregir.

**Sorteo justo, con una prioridad explícita.** MAPAU toma las primeras mesas
por regla de la federación, no por azar; lo que queda se reparte con
Fisher-Yates, que da la misma probabilidad a cada orden posible. Un índice único
en la base impide que dos emprendimientos terminen en la misma mesa.

**Cruce de objetos perdidos.** El foro compara lo perdido contra lo encontrado
por categoría, campus y palabras en común, y propone pares arriba del listado.
Es lo que separa un foro de un muro de mensajes sueltos.

**Suscripciones sin cobrar.** Elegir un plan crea una *solicitud*. Tesorería
FEUCN confirma el pago fuera de la plataforma y recién entonces se activa. No
hay pasarela ni datos bancarios en ninguna parte del código.

**Gráficos propios, sin librería de charts.** Todos los gráficos son SVG escrito
a mano con reglas fijas: barras finas con extremo redondeado de 4 px, líneas de
2 px, marcadores con anillo del color de la superficie, grilla de un pelo,
leyenda siempre que haya dos o más series y etiquetas directas selectivas.

**La marca sale del logo.** El vitral de la FEUCN es un arcoíris — azul, verde,
amarillo, naranja, rojo, fucsia, violeta — y esa gama es la firma de la
plataforma: la franja superior, los degradados del hero y los acentos de cada
sección salen de ahí. El verde del vitral (`#0b7a54`, 5.35:1 sobre blanco) hace
de color de acción, porque un arcoíris completo no sirve para un botón.

**Color validado, no elegido a ojo.** La paleta categórica, la rampa secuencial
del mapa de calor y la rampa ordinal del embudo pasaron un validador de
accesibilidad cromática en modo claro y oscuro: banda de luminosidad, piso de
croma, separación bajo daltonismo y contraste contra la superficie real. Dos
tonos quedan bajo 3:1 en modo claro, y por eso **todos los gráficos con color
categórico ofrecen "Ver tabla"** y llevan etiquetas directas: el color nunca es
el único canal.

**Salidas sin dependencias.** La planilla sale como CSV con separador `;` y BOM
UTF-8, que es lo que Excel en español abre bien de una; el PDF sale del diálogo
de impresión del navegador. Sumar una librería de `.xlsx` y otra de PDF habría
pesado más que toda la aplicación para hacer lo mismo.

**Portadas generadas.** Un aviso sin fotos no muestra un recuadro gris: se le
dibuja una portada derivada de su id y su tipo, siempre la misma para el mismo
aviso.

---

## Accesibilidad

- Navegación completa por teclado, con salto al contenido y trampa de foco en
  los diálogos (Escape cierra, Tab circula, el foco vuelve al origen).
- Modo claro y oscuro, siguiendo el sistema salvo que se elija a mano.
- Los gráficos exponen su tabla de datos y describen su contenido por `aria-label`.
- Se respeta `prefers-reduced-motion`.
- Objetivos táctiles de al menos 32 px y diseño usable desde 360 px de ancho.

---

## Datos de demostración

Al abrir por primera vez se cargan datos deterministas: avisos vigentes, casos
del foro, emprendimientos con distintos planes, una cola de moderación con
casos límite a propósito (uno pide pago adelantado, otro ofrece trabajos
académicos), una feria abierta con doce postulaciones —dos de ellas MAPAU, para
ver la prioridad de mesas— y un mes de eventos para que las series tengan
historia. Los RUT de demostración tienen dígito verificador válido.

Para cambiar de cuenta de estudiante se usa el menú del avatar; al panel se
entra por `/admin`. El panel exporta toda la base como JSON. Si se cambia el modelo de
datos hay que subir `version` en `seed.ts` y en la comprobación de `api.ts`:
eso descarta el `localStorage` viejo.
