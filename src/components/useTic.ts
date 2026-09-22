import { useEffect, useState } from 'react'

/**
 * Repinta cada cierto tiempo para que las cuentas regresivas de vigencia
 * avancen solas, sin recargar la página.
 */
export const useTic = (intervalo = 30_000) => {
  const [, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), intervalo)
    return () => clearInterval(id)
  }, [intervalo])
}
