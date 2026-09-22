/**
 * Salidas que la federación usa fuera del sitio: la planilla para Excel y la
 * hoja de control que se imprime y se lleva a la feria.
 *
 * Las dos se generan en el navegador a propósito. Un .xlsx real obligaría a
 * sumar una librería pesada para algo que Excel abre igual, y el PDF sale del
 * propio diálogo de impresión ("Guardar como PDF"), que además deja elegir
 * tamaño de hoja.
 */

const descargar = (blob: Blob, nombreArchivo: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const celda = (valor: string | number | boolean) => {
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  const texto = String(valor ?? '')
  // Punto y coma como separador: es lo que espera Excel en español.
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export const descargarCSV = (
  nombreArchivo: string,
  columnas: string[],
  filas: (string | number | boolean)[][],
) => {
  const lineas = [columnas.map(celda).join(';'), ...filas.map((f) => f.map(celda).join(';'))]
  // El BOM le dice a Excel que el archivo viene en UTF-8; sin él, se comen las tildes.
  const contenido = `﻿${lineas.join('\r\n')}`
  descargar(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }), nombreArchivo)
}

const ESTILO_IMPRESION = `
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: #111; margin: 0; font-size: 11px; line-height: 1.4;
  }
  header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
  header img { width: 56px; height: 56px; border-radius: 50%; }
  h1 { font-size: 16px; margin: 0 0 2px; letter-spacing: -0.02em; }
  .sub { font-size: 11px; color: #555; }
  .meta { display: flex; gap: 18px; font-size: 10.5px; color: #555; margin-bottom: 12px; flex-wrap: wrap; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 6px 7px; text-align: left; vertical-align: middle; }
  th { background: #eee; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; }
  td.num, th.num { text-align: center; width: 34px; }
  td.firma { width: 22%; height: 34px; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }
  .pie { margin-top: 16px; font-size: 10px; color: #555; display: flex; justify-content: space-between; }
  .nota { margin-top: 10px; font-size: 10px; color: #333; border-top: 1px solid #ccc; padding-top: 8px; }
`

/**
 * Abre una ventana con la hoja lista y lanza el diálogo de impresión. Desde ahí
 * se imprime o se guarda como PDF.
 */
export const imprimirHoja = (titulo: string, cuerpoHtml: string): boolean => {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return false
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8" />
    <title>${titulo}</title><style>${ESTILO_IMPRESION}</style></head>
    <body>${cuerpoHtml}</body></html>`)
  win.document.close()
  win.focus()
  // Espera a que el logo cargue: si no, sale una hoja con el hueco en blanco.
  const lanzar = () => {
    win.print()
  }
  const img = win.document.querySelector('img')
  if (img && !img.complete) {
    img.addEventListener('load', lanzar)
    img.addEventListener('error', lanzar)
  } else {
    setTimeout(lanzar, 180)
  }
  return true
}

export const escaparHtml = (texto: string) =>
  texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
