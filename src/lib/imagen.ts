/**
 * Reduce una foto en el navegador antes de guardarla.
 * Sin esto, tres fotos de celular llenan la cuota de localStorage; con el
 * backend real esta misma función sigue sirviendo para no subir 8 MB por aviso.
 */
export const comprimirImagen = (archivo: File, ladoMax = 1100, calidad = 0.72): Promise<string> =>
  new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'))
      img.onload = () => {
        const escala = Math.min(1, ladoMax / Math.max(img.width, img.height))
        const lienzo = document.createElement('canvas')
        lienzo.width = Math.round(img.width * escala)
        lienzo.height = Math.round(img.height * escala)
        const ctx = lienzo.getContext('2d')
        if (!ctx) return reject(new Error('Canvas no disponible'))
        ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height)
        resolve(lienzo.toDataURL('image/jpeg', calidad))
      }
      img.src = String(lector.result)
    }
    lector.readAsDataURL(archivo)
  })
