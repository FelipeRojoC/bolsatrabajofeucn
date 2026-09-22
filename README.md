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
| Planes | `/planes` | Planes mensuales del directorio y transparencia del gasto |
| Publicar | `/publicar` | Asistente de 4 pasos con vista previa en vivo |
| Mis avisos | `/mis-avisos` | Métricas por aviso, renovación y guardados |
| Estadísticas | `/estadisticas` | Panel público de uso de la plataforma |
| La FEUCN | `/feucn` | Quiénes son, reglamento de la bolsa, contacto y oficina |
| Moderación | `/moderacion` | Cola priorizada por riesgo, reportes, altas y suscripciones |

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
│   └── imagen.ts       Compresión de fotos en el navegador
├── state/AppProvider.tsx   Sesión, tema, avisos flotantes, refresco de datos
├── components/
│   ├── Graficos.tsx    Gráficos en SVG propio (sin librerías)
│   ├── Mapa.tsx        Envoltorio de Leaflet (selector y vista)
│   ├── TarjetaAviso.tsx · DetalleAviso.tsx · Layout.tsx · UI.tsx · Iconos.tsx
│   └── BuscadorRapido.tsx   Búsqueda global (Ctrl/Cmd + K)
├── pages/              Una por sección
└── styles/             tokens.css · base.css · componentes.css
```

### Cómo conectar el backend

`src/lib/api.ts` es el único archivo que toca datos. Cada función ya es `async`
y tiene la firma del endpoint que la reemplazaría:

```
listarPosts(filtros)          →  GET    /api/avisos?tipo=…&campus=…
obtenerPost(id)               →  GET    /api/avisos/:id
crearPost(borrador)           →  POST   /api/avisos
moderarPost(id, accion, …)    →  PATCH  /api/avisos/:id/moderacion
renovarPost(id)               →  POST   /api/avisos/:id/renovacion
registrarEvento(kind, id)     →  POST   /api/eventos
reportarPost(id, motivo, …)   →  POST   /api/reportes
solicitarPlan(datos)          →  POST   /api/suscripciones/solicitudes
resolverSolicitud(id, accion) →  PATCH  /api/suscripciones/solicitudes/:id
```

Pendientes que **tienen que vivir en el servidor**, no acá:

1. **Autenticación institucional.** Hoy la sesión se cambia desde un menú de
   demostración. En producción: SSO de la UCN o verificación del correo
   `@alumnos.ucn.cl` / `@ucn.cl`.
2. **Autorización.** `esModerador` es una comprobación de interfaz, no una
   barrera: el panel de moderación debe estar protegido por rol en la API.
3. **Expiración de avisos.** El barrido del navegador es una comodidad visual;
   la verdad la tiene un job programado en el servidor.
4. **Conteo de eventos.** Debe escribirse en una tabla append-only del lado del
   servidor, con control de duplicados por sesión/IP. En el cliente es
   falsificable.
5. **Tiles del mapa.** `Mapa.tsx` usa los tiles públicos de OpenStreetMap, que
   no cubren una aplicación con tráfico real. Hay que contratar un proveedor
   (MapTiler, Stadia, Mapbox) o levantar uno propio. Si los tiles fallan, el
   mapa avisa y el punto igual queda guardado.
6. **Imágenes.** Hoy se guardan como data URL comprimidas. Con backend van a
   almacenamiento de objetos y en el aviso queda solo la URL.
7. **Correos.** Los avisos de aprobación, rechazo y vencimiento están descritos
   en la interfaz pero no se envían: faltan del lado del servidor.

---

## Decisiones de diseño

**Riesgo automático en la moderación.** Al enviar un aviso se calcula un puntaje
0–100 (`evaluarRiesgo`) a partir de términos del reglamento: pagos por
adelantado, productos restringidos, trabajos académicos resueltos, montos fuera
de escala. No bloquea nada — ordena la cola para que lo sospechoso se revise
primero, y el mismo aviso se le muestra al autor **antes** de publicar para que
pueda corregir.

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

**Color validado, no elegido a ojo.** La paleta categórica, la rampa secuencial
del mapa de calor y la rampa ordinal del embudo pasaron un validador de
accesibilidad cromática en modo claro y oscuro: banda de luminosidad, piso de
croma, separación bajo daltonismo y contraste contra la superficie real. Dos
tonos quedan bajo 3:1 en modo claro, y por eso **todos los gráficos con color
categórico ofrecen "Ver tabla"** y llevan etiquetas directas: el color nunca es
el único canal.

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
académicos) y un mes de eventos para que las series tengan historia.

Para cambiar de cuenta —estudiante o moderación— se usa el menú del avatar. El
panel de moderación exporta toda la base como JSON. Si se cambia el modelo de
datos hay que subir `version` en `seed.ts` y en la comprobación de `api.ts`:
eso descarta el `localStorage` viejo.
