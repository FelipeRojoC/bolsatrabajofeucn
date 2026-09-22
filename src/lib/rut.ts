/**
 * RUT chileno: limpieza, formato y dígito verificador (módulo 11).
 * Se valida al postular a una feria porque la lista se usa después para
 * controlar la entrada, y un RUT mal escrito ahí es un problema en terreno.
 */

export const limpiarRut = (rut: string) => rut.replace(/[^0-9kK]/g, '').toUpperCase()

export const digitoVerificador = (cuerpo: string): string => {
  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = 11 - (suma % 11)
  if (resto === 11) return '0'
  if (resto === 10) return 'K'
  return String(resto)
}

export const rutValido = (rut: string): boolean => {
  const limpio = limpiarRut(rut)
  if (limpio.length < 8 || limpio.length > 9) return false
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false
  return digitoVerificador(cuerpo) === dv
}

/** 12345678K → 12.345.678-K */
export const formatearRut = (rut: string): string => {
  const limpio = limpiarRut(rut)
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
}
