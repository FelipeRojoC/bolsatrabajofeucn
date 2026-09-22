/**
 * Envoltorio de Leaflet. Se usa en dos modos:
 *  - selector: el autor arrastra el pin para fijar el punto de encuentro.
 *  - vista: se muestran los avisos activos sobre el mapa del campus.
 *
 * Los tiles vienen de OpenStreetMap; si no hay red, el mapa queda en gris pero
 * el pin y las coordenadas siguen funcionando, así que el formulario no se
 * bloquea nunca por estar sin conexión.
 */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeoPoint } from '../lib/types'

export interface PuntoMapa {
  id: string
  punto: GeoPoint
  color: string
  titulo: string
  glifo?: string
  alPulsar?: () => void
}

interface Props {
  centro: GeoPoint
  zoom?: number
  puntos?: PuntoMapa[]
  /** Activa el pin arrastrable y devuelve la coordenada elegida. */
  seleccionable?: boolean
  valor?: GeoPoint
  alElegir?: (p: GeoPoint) => void
  alto?: 'normal' | 'alto'
}

const icono = (color: string, glifo?: string) =>
  L.divIcon({
    className: '',
    html: `<div class="pin-mapa" style="background:${color}"><span>${glifo ?? ''}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 24],
  })

export const MapaLeaflet = ({ centro, zoom = 16, puntos = [], seleccionable, valor, alElegir, alto = 'normal' }: Props) => {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const capa = useRef<L.LayerGroup | null>(null)
  const pin = useRef<L.Marker | null>(null)
  const [sinTiles, setSinTiles] = useState(false)
  const alElegirRef = useRef(alElegir)
  alElegirRef.current = alElegir

  useEffect(() => {
    if (!contenedor.current || mapa.current) return
    const m = L.map(contenedor.current, {
      center: [centro.lat, centro.lng],
      zoom,
      scrollWheelZoom: false,
      attributionControl: true,
    })
    // Host único: OpenStreetMap dejó atrás el patrón de subdominios {s}.
    // En producción hay que apuntar esto al proveedor de tiles propio de la
    // federación; la política de uso de OSM no cubre una app con tráfico real.
    const capaTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    })
    capaTiles.on('tileerror', () => setSinTiles(true))
    capaTiles.on('tileload', () => setSinTiles(false))
    capaTiles.addTo(m)
    capa.current = L.layerGroup().addTo(m)
    mapa.current = m

    if (seleccionable) {
      m.on('click', (e: L.LeafletMouseEvent) => {
        alElegirRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng })
      })
    }
    // Leaflet fija el tamaño del mapa al crearlo. Acá se monta dentro de
    // modales que se están animando y de pasos de formulario que aparecen de
    // golpe, así que el tamaño correcto llega después: sin este observador los
    // tiles quedan corridos fuera del contenedor.
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(contenedor.current)
    requestAnimationFrame(() => m.invalidateSize())

    return () => {
      ro.disconnect()
      m.remove()
      mapa.current = null
      capa.current = null
      pin.current = null
    }
    // Se monta una sola vez a propósito: el resto se actualiza en efectos aparte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mapa.current?.setView([centro.lat, centro.lng], zoom, { animate: true })
  }, [centro.lat, centro.lng, zoom])

  useEffect(() => {
    if (!capa.current) return
    capa.current.clearLayers()
    for (const p of puntos) {
      const marcador = L.marker([p.punto.lat, p.punto.lng], { icon: icono(p.color, p.glifo) })
        .bindTooltip(p.titulo, { direction: 'top', offset: [0, -22] })
      if (p.alPulsar) marcador.on('click', p.alPulsar)
      marcador.addTo(capa.current)
    }
  }, [puntos])

  useEffect(() => {
    if (!seleccionable || !mapa.current || !valor) return
    if (!pin.current) {
      pin.current = L.marker([valor.lat, valor.lng], {
        draggable: true,
        icon: icono('var(--marca)', '📍'),
      }).addTo(mapa.current)
      pin.current.on('dragend', () => {
        const ll = pin.current!.getLatLng()
        alElegirRef.current?.({ lat: ll.lat, lng: ll.lng })
      })
    } else {
      pin.current.setLatLng([valor.lat, valor.lng])
    }
  }, [seleccionable, valor])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={contenedor} className={`mapa${alto === 'alto' ? ' mapa-alto' : ''}`} />
      {sinTiles && (
        <p className="mapa-aviso" role="status">
          No se pudo cargar el mapa base. El punto igual quedó guardado
          {valor ? ` en ${valor.lat.toFixed(4)}, ${valor.lng.toFixed(4)}` : ''}.
        </p>
      )}
    </div>
  )
}
