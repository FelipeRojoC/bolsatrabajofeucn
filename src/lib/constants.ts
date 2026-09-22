import type { GeoPoint, Plan, PostType, TipoLugar } from './types'

/** Vigencia máxima de un aviso, en días. Regla del reglamento FEUCN. */
export const MAX_DIAS_VIGENCIA = 5

/** Cuántas veces un autor puede renovar antes de tener que republicar. */
export const MAX_RENOVACIONES = 1

export const TIPOS: Record<PostType, { label: string; plural: string; icono: string; color: string; descripcion: string }> = {
  trabajo: {
    label: 'Trabajo',
    plural: 'Trabajos y servicios',
    icono: 'briefcase',
    color: 'var(--serie-1)',
    descripcion: 'Pololos, ayudantías, servicios y oportunidades laborales para estudiantes.',
  },
  venta: {
    label: 'Venta',
    plural: 'Compra y venta',
    icono: 'tag',
    color: 'var(--serie-2)',
    descripcion: 'Libros, apuntes, tecnología y todo lo que ya no usas y a alguien le sirve.',
  },
  perdido: {
    label: 'Perdido',
    plural: '¿Se perdió esto?',
    icono: 'search',
    color: 'var(--serie-3)',
    descripcion: 'Foro de objetos perdidos y encontrados dentro de la universidad.',
  },
}

export const CATEGORIAS: Record<PostType, string[]> = {
  trabajo: [
    'Ayudantía',
    'Clases particulares',
    'Diseño y audiovisual',
    'Programación y soporte TI',
    'Eventos y producción',
    'Ventas y atención',
    'Traducción y redacción',
    'Práctica profesional',
    'Otro',
  ],
  venta: [
    'Libros y apuntes',
    'Tecnología',
    'Instrumentos y herramientas',
    'Ropa y calzado',
    'Hogar y mudanza',
    'Bicicletas y movilidad',
    'Materiales de carrera',
    'Otro',
  ],
  perdido: [
    'Documentos y TNE',
    'Llaves',
    'Tecnología',
    'Ropa y accesorios',
    'Mochilas y bolsos',
    'Mascotas en el campus',
    'Otro',
  ],
}

export const RUBROS_EMPRENDIMIENTO = [
  'Comida y repostería',
  'Moda y accesorios',
  'Diseño gráfico',
  'Fotografía y video',
  'Tecnología y desarrollo',
  'Belleza y bienestar',
  'Arte y manualidades',
  'Asesorías y educación',
  'Otro',
]

/** Campus Central UCN, avenida Angamos 0610, Antofagasta. */
export const CAMPUS: { nombre: string; punto: GeoPoint } = {
  nombre: 'Campus Central UCN',
  punto: { lat: -23.6844, lng: -70.4115 },
}

/** Centro de Antofagasta, para los avisos que se coordinan fuera del campus. */
export const CIUDAD: GeoPoint = { lat: -23.6509, lng: -70.3975 }

export const LUGARES: { tipo: TipoLugar; etiqueta: string; zonas: string[] }[] = [
  {
    tipo: 'campus',
    etiqueta: 'En el campus',
    zonas: [
      'Entrada principal',
      'Biblioteca central',
      'Casino',
      'Patio de las banderas',
      'Edificio Y',
      'Sala de estudio',
      'Gimnasio',
      'Estacionamiento',
    ],
  },
  {
    tipo: 'fuera',
    etiqueta: 'Fuera del campus',
    zonas: [
      'A coordinar por mensaje',
      'Centro de Antofagasta',
      'Mall Plaza Antofagasta',
      'Terminal de buses',
      'Sector norte',
      'Sector sur',
    ],
  },
]

export const ZONAS_CAMPUS = LUGARES[0].zonas
export const ZONAS_FUERA = LUGARES[1].zonas

export const puntoBase = (tipo: TipoLugar): GeoPoint => (tipo === 'campus' ? CAMPUS.punto : CIUDAD)

export const PLANES: Plan[] = [
  {
    id: 'vitrina',
    nombre: 'Vitrina',
    precioMensual: 0,
    descripcion: 'Para partir. Tu emprendimiento aparece en el directorio con lo esencial.',
    beneficios: [
      'Ficha básica en el directorio',
      'Un enlace de contacto',
      'Hasta 280 caracteres de descripción',
      'Estadísticas de vistas',
    ],
    limiteCaracteres: 280,
    destacado: false,
  },
  {
    id: 'emprendedor',
    nombre: 'Emprendedor',
    precioMensual: 3500,
    descripcion: 'Perfil completo con redes sociales y catálogo. El plan que usa la mayoría.',
    beneficios: [
      'Instagram, TikTok y sitio web enlazados',
      'Descripción extendida hasta 1.200 caracteres',
      'Catálogo de hasta 6 productos o servicios',
      'Foto de portada y galería',
      'Panel de estadísticas con clics por canal',
      'Prioridad media en el directorio',
    ],
    limiteCaracteres: 1200,
    destacado: true,
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precioMensual: 7900,
    descripcion: 'Máxima visibilidad: aparece destacado y en la portada del directorio.',
    beneficios: [
      'Todo lo del plan Emprendedor',
      'Destacado fijo en la portada del directorio',
      'Catálogo ilimitado',
      'Aviso en el feed sin consumir tus publicaciones',
      'Reporte mensual por correo',
      'Difusión en las redes de la FEUCN una vez al mes',
    ],
    limiteCaracteres: 3000,
    destacado: false,
  },
]

export const MOTIVOS_RECHAZO = [
  'Contenido que sugiere una transacción en la plataforma',
  'Producto o servicio prohibido por el reglamento',
  'Datos de contacto incompletos o no verificables',
  'No corresponde a la comunidad UCN',
  'Publicación duplicada',
  'Lenguaje ofensivo o discriminatorio',
  'Información insuficiente para publicar',
]

export const MOTIVOS_REPORTE = [
  'Parece una estafa',
  'Producto prohibido',
  'Contenido ofensivo',
  'Publicación duplicada',
  'El contacto no responde / datos falsos',
  'No corresponde a la categoría',
]

/**
 * Términos que elevan el puntaje de riesgo y mandan el aviso al principio de la
 * cola de moderación. No bloquean la publicación: solo priorizan la revisión.
 */
export const TERMINOS_RIESGO: { termino: string; peso: number; bandera: string }[] = [
  { termino: 'transferencia', peso: 30, bandera: 'Menciona transferencia de dinero' },
  { termino: 'deposito', peso: 30, bandera: 'Menciona depósito' },
  { termino: 'depósito', peso: 30, bandera: 'Menciona depósito' },
  { termino: 'abono previo', peso: 35, bandera: 'Pide pago adelantado' },
  { termino: 'pago adelantado', peso: 35, bandera: 'Pide pago adelantado' },
  { termino: 'cripto', peso: 25, bandera: 'Menciona criptomonedas' },
  { termino: 'bitcoin', peso: 25, bandera: 'Menciona criptomonedas' },
  { termino: 'alcohol', peso: 40, bandera: 'Producto restringido' },
  { termino: 'cerveza', peso: 40, bandera: 'Producto restringido' },
  { termino: 'vape', peso: 35, bandera: 'Producto restringido' },
  { termino: 'cigarr', peso: 35, bandera: 'Producto restringido' },
  { termino: 'arma', peso: 60, bandera: 'Producto prohibido' },
  { termino: 'medicamento', peso: 45, bandera: 'Requiere revisión sanitaria' },
  { termino: 'prueba resuelta', peso: 50, bandera: 'Posible falta a la integridad académica' },
  { termino: 'certamen resuelto', peso: 50, bandera: 'Posible falta a la integridad académica' },
  { termino: 'hago tu tesis', peso: 50, bandera: 'Posible falta a la integridad académica' },
  { termino: 'te hago el informe', peso: 45, bandera: 'Posible falta a la integridad académica' },
]

export const CONSEJOS_SEGURIDAD = [
  'Junténse en un punto con gente: biblioteca, casino o la entrada del campus.',
  'Revisa el objeto antes de cerrar cualquier trato.',
  'La FEUCN no participa en el pago: nadie de la federación te va a pedir dinero.',
  'Desconfía de quien te pida transferir antes de verse.',
  'Si algo se ve raro, usa el botón de reportar: la moderación lo revisa el mismo día.',
]
