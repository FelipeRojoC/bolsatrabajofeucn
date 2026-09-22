# Plantillas de correo

Supabase manda, por defecto, un **enlace** para confirmar la cuenta y otro para
recuperar la contraseña. La aplicación espera un **código de 6 dígitos**, así
que hay que cambiar las plantillas: la variable `{{ .Token }}` es el código y
`{{ .ConfirmationURL }}` es el enlace.

**Dónde:** Supabase → Authentication → **Emails** → pestaña *Templates*.

Pega el asunto y el cuerpo de cada una y guarda.

---

## 1. Confirm signup

**Subject:** `Tu código para entrar a la Bolsa FEUCN`

```html
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#111">
  <h2 style="color:#0b7a54;margin:0 0 4px">Bienvenido a la Bolsa de Trabajo FEUCN</h2>
  <p style="color:#555;margin:0 0 24px">Federación de Estudiantes UCN Antofagasta</p>

  <p>Para confirmar tu cuenta, escribe este código en la página:</p>

  <p style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;
            background:#e3f5ed;color:#075b3e;padding:18px;border-radius:12px;margin:22px 0">
    {{ .Token }}
  </p>

  <p style="color:#555;font-size:14px">
    El código vence en una hora. Si no creaste ninguna cuenta, ignora este correo:
    sin el código nadie puede entrar.
  </p>
</div>
```

---

## 2. Reset Password

**Subject:** `Código para cambiar tu contraseña — Bolsa FEUCN`

```html
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#111">
  <h2 style="color:#0b7a54;margin:0 0 4px">Cambiar tu contraseña</h2>
  <p style="color:#555;margin:0 0 24px">Bolsa de Trabajo FEUCN</p>

  <p>Pediste cambiar la contraseña de tu cuenta. Escribe este código en la página:</p>

  <p style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;
            background:#e3f5ed;color:#075b3e;padding:18px;border-radius:12px;margin:22px 0">
    {{ .Token }}
  </p>

  <p style="color:#555;font-size:14px">
    Vence en una hora. <strong>Si no fuiste tú, no hagas nada</strong>: tu contraseña
    actual sigue funcionando y nadie puede cambiarla sin este código.
  </p>
</div>
```

---

## 3. Magic Link y Change Email (por si se usan más adelante)

La aplicación no las usa hoy. Si algún día se activan, el mismo criterio:
reemplazar `{{ .ConfirmationURL }}` por `{{ .Token }}`.

---

## Importante: el servidor de correo

Supabase trae un servidor de correo de cortesía que **sirve para probar y nada
más**: manda unos pocos mensajes por hora y solo a direcciones del propio
equipo del proyecto. Con eso, un estudiante cualquiera **no recibe el código**.

Para abrirlo a toda la comunidad hay que configurar SMTP propio en
**Authentication → Emails → SMTP Settings**. Con [Resend](https://resend.com)
—el mismo servicio de los correos de la feria— el paso a paso es:

1. Crear la cuenta y verificar el dominio de la federación (`feucn.cl`).
2. Generar una API key.
3. En Supabase, SMTP Settings:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: la API key
   - Sender email: `no-responder@feucn.cl`
   - Sender name: `Bolsa de Trabajo FEUCN`

Mientras no esté configurado, hay dos caminos para probar:

- **Authentication → Providers → Email → desactivar "Confirm email".** Las
  cuentas quedan usables al instante, sin código. El filtro de dominio UCN
  sigue en pie. Sirve para probar; no para dejarlo así en público.
- Crear las cuentas de prueba a mano desde **Authentication → Users**, marcando
  *Auto Confirm User*.
