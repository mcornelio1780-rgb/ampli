# Ampli · Web + Ampli Desk

Ampli es una marca de **Limly LLC** (Delaware, EE.UU.). Contacto: manyosa@limly.io
Sitio estático (HTML + JS, sin compilación), en español, inglés, portugués y francés. Costo: $0.

```
/                     → landing (index.html)
/app/                 → Ampli Desk (MVP)
/legal/               → Términos (#terms), Privacidad (#privacy), Uso de IA (#ai)
/gracias.html         → página a la que Polar devuelve después de pagar
/config.js            → ÚNICO archivo que se edita
/assets/core.js       → cuentas, formularios y pagos (no editar)
/firebase/firestore.rules → reglas de seguridad de Firebase
/supabase/schema.sql      → base de datos si algún día usas Supabase
/docs/guia-polar.md       → guía para crear productos y links en Polar
```

## Funciona desde el primer día, sin configurar nada

Con `config.js` tal como viene:

- La landing y Ampli Desk funcionan completos, en 4 idiomas, sin avisos de prueba.
- El botón "Abrir Ampli Desk" entra directo (todavía sin login).
- Los formularios (talento, clínicas, preguntas) llegan por correo a **manyosa@limly.io** vía FormSubmit (gratis).
  **La primera vez que alguien envíe un formulario, FormSubmit te manda un correo "Activate form": ábrelo y confirma.** Desde ahí llegan todos.
- Los botones de compra muestran "Muy pronto podrás pagar en línea" y llevan al formulario para reservar el lugar.

Cuando tengas Firebase y los links de Polar, solo editas `config.js` y GitHub/Vercel publica solo.

## Orden para salir del "círculo vicioso" web ↔ Polar

1. Sube este proyecto a GitHub y publícalo en Vercel → obtienes la URL (ej. `https://ampli.vercel.app`).
2. Con esa URL creas los Checkout Links en Polar (Success URL = `https://TU-URL/gracias.html?p=kit&checkout_id={CHECKOUT_ID}`).
3. Pegas los 3 links en `config.js` → se publica solo.
4. Cuando quieras cuentas: Firebase (abajo) → pegas 4 datos en `config.js`.

## 1. GitHub (10 min)

1. github.com → **New repository** → nombre `ampli-web` → Private → **Create repository**.
2. En el repo vacío: **uploading an existing file** → arrastra **el contenido** de esta carpeta (no la carpeta) → **Commit changes**.

## 2. Vercel (5 min)

1. vercel.com → entra con GitHub → **Add New → Project** → elige `ampli-web` → **Import**.
2. Framework Preset: **Other**. Build Command y Output Directory: vacíos. → **Deploy**.
3. Copia la URL que te da (ej. `https://ampli-web.vercel.app`) y pégala en `config.js` → `siteUrl`.

> Ojo: el plan gratuito de Vercel (Hobby) es "solo uso personal y no comercial" según sus propias reglas. Para una web que vende, Vercel pide el plan Pro ($20/mes). La alternativa gratis que sí permite uso comercial es **Cloudflare Pages** (dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → elige el repo → Build command vacío, output `/` → Deploy). El proyecto funciona igual en los dos.

## 3. Firebase: cuentas y base de datos (20 min, gratis)

1. console.firebase.google.com → **Crear un proyecto** → nombre `ampli-limly` → Google Analytics: desactivado → Crear.
2. Menú izquierdo **Compilación → Authentication → Comenzar** → pestaña **Método de acceso**:
   - **Correo electrónico/contraseña** → Habilitar → Guardar.
   - **Google** → Habilitar → elige tu correo de soporte → Guardar.
3. **Authentication → Configuración → Dominios autorizados → Agregar dominio** → tu dominio de Vercel sin `https://` (ej. `ampli-web.vercel.app`).
4. **Authentication → Plantillas** → ícono de idioma → Español → nombre del remitente "Ampli".
5. **Compilación → Firestore Database → Crear base de datos** → ubicación `nam5 (United States)` → **Iniciar en modo de producción** → Crear.
6. **Dónde pegar las reglas de seguridad:** dentro de Firestore Database, arriba hay pestañas **Datos · Reglas · Índices · Uso**. Entra a **Reglas** → selecciona todo el texto que aparece y bórralo → abre `firebase/firestore.rules`, copia todo y pégalo → botón **Publicar**.
7. **⚙ (arriba a la izquierda) → Configuración del proyecto → General → Tus apps → ícono `</>` (Web)** → apodo `ampli-web` → **Registrar app** (no marques Hosting). Verás un bloque `firebaseConfig`. Copia 4 valores a `config.js`:
   `apiKey`, `authDomain`, `projectId`, `appId`.
8. Commit en GitHub → Vercel publica → prueba "Entrar → Crear cuenta" en incógnito.

**¿Dónde veo los datos?** Firestore Database → **Datos**: `leads` (formularios), `profiles` (cuentas), `app_events` (uso de Ampli Desk). Los usuarios: Authentication → Usuarios. Los reclamos de Ampli Desk no se suben: quedan en el navegador de cada usuario (privacidad médica, HIPAA).

## 4. Polar

Sigue `docs/guia-polar.md`. Al final pega en `config.js`:

```js
polar: {
  kit:    "https://buy.polar.sh/polar_cl_...",
  cohort: "https://buy.polar.sh/polar_cl_...",
  pilot:  "https://buy.polar.sh/polar_cl_..."
},
```

Cupones: comparte `https://TU-URL/?cupon=LATAM25` y el código se precarga en el pago.

## Cómo editar `config.js` sin descargar nada

GitHub → repo `ampli-web` → archivo `config.js` → ícono del lápiz → pega los valores entre las comillas → **Commit changes**. En 1 minuto Vercel lo publica.
