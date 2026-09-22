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

El panel vive en `/moderacion` y se entra por `/admin` con usuario y contraseña.
Desde ahí se aprueban y rechazan publicaciones, se ven los reportes, se
gestionan las altas del directorio, las suscripciones y las ferias.

> **La contraseña de desarrollo está escrita en `src/lib/auth.ts` y este
> repositorio es público.** Cualquiera que lea el código puede entrar al panel.
> Es una medida temporal pedida a propósito para poder trabajar sin backend.
>
> **Antes de publicar el sitio hay que borrar `ADMIN_LOCAL` de `auth.ts`** y
> dejar solo Supabase Auth, donde las cuentas se crean únicamente desde el panel
> de Supabase.

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
Menú lateral → **SQL Editor** → *New query* → pega `supabase/schema.sql` completo
→ **Run**. Se puede volver a ejecutar sin romper nada.

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

**7. Migrar las funciones**
`hayBackend()` ya devuelve `true`. Ahora se va reemplazando el cuerpo de cada
función de `src/lib/api.ts` por su llamada a Supabase, una por una y probando
entremedio. Mientras una siga en localStorage, sigue funcionando igual.

### Lo que sigue pendiente

1. **Autenticación institucional.** Hoy la sesión se cambia desde un menú de
   demostración y el panel entra con una clave escrita en el código. Con
   Supabase ya configurado, falta cambiar el ingreso a `signInWithPassword` y
   **borrar `ADMIN_LOCAL` de `src/lib/auth.ts`**.
2. **Conteo de eventos.** En el cliente es falsificable. El esquema ya trae
   `registrar_evento()` para que lo escriba el servidor.
3. **Tiles del mapa.** `MapaLeaflet.tsx` usa los tiles públicos de
   OpenStreetMap, que no cubren una aplicación con tráfico real. Hay que
   contratar un proveedor (MapTiler, Stadia, Mapbox). Si fallan, el mapa avisa
   y el punto igual queda guardado.
4. **Imágenes.** Hoy se guardan como data URL comprimidas; con backend van a
   Supabase Storage y en el aviso queda solo la URL.
5. **Correos de aprobación y rechazo** de avisos, del mismo modo que los de la
   feria.

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
