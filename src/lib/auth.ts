/**
 * Acceso al panel de administración.
 *
 * ⚠️ ESTA CLAVE VIAJA EN EL CÓDIGO DEL SITIO. Cualquiera que abra las
 * herramientas de desarrollo del navegador puede leerla, y el repositorio es
 * público. Es una solución temporal pedida explícitamente para poder trabajar
 * mientras no existe backend.
 *
 * Al conectar Supabase, el ingreso pasa a Supabase Auth y las cuentas se crean
 * solo desde el panel de Supabase: basta con borrar ADMIN_LOCAL de aquí y la
 * puerta local queda cerrada.
 */
export const ADMIN_LOCAL = {
  usuario: 'admin',
  clave: 'feliperojo123',
}

export const credencialesValidas = (usuario: string, clave: string) =>
  usuario.trim().toLowerCase() === ADMIN_LOCAL.usuario && clave === ADMIN_LOCAL.clave
