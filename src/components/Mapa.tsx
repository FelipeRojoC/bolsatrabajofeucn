import { Suspense, lazy } from 'react'
import type { ComponentProps } from 'react'
import type { MapaLeaflet } from './MapaLeaflet'

/**
 * Leaflet y su CSS pesan más que el resto de la app junta, y la mayoría de las
 * vistas no muestran un mapa. Se carga recién cuando alguna lo monta.
 */
const Cargado = lazy(() => import('./MapaLeaflet').then((m) => ({ default: m.MapaLeaflet })))

type Props = ComponentProps<typeof MapaLeaflet>

export const Mapa = (props: Props) => (
  <Suspense
    fallback={
      <div className={`mapa${props.alto === 'alto' ? ' mapa-alto' : ''} esqueleto`} aria-hidden="true" />
    }
  >
    <Cargado {...props} />
  </Suspense>
)

export type { PuntoMapa } from './MapaLeaflet'
