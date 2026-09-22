import logoFeucn from '../assets/feucn-logo.jpg'

/**
 * Logo oficial de la Federación de Estudiantes UCN Antofagasta.
 *
 * El archivo es un JPG con fondo blanco, así que siempre va sobre una base
 * blanca propia: en modo oscuro, un logo con fondo blanco recortado se vería
 * como un parche. Si algún día llega la versión en SVG con fondo
 * transparente, se reemplaza el import y se puede soltar el `--base-logo`.
 */
export const LogoFeucn = ({ tam = 38, aro = true }: { tam?: number; aro?: boolean }) => (
  <span
    className={`marca-glifo${aro ? ' con-aro' : ''}`}
    style={{ width: tam, height: tam }}
    aria-hidden="true"
  >
    <img src={logoFeucn} alt="" width={tam} height={tam} />
  </span>
)

/** Versión grande para el hero, sin recorte circular. */
export const LogoFeucnGrande = ({ tam = 200 }: { tam?: number }) => (
  <img
    className="logo-heroe"
    src={logoFeucn}
    alt="Logo de la Federación de Estudiantes UCN Antofagasta"
    width={tam}
    height={tam}
    loading="eager"
  />
)
