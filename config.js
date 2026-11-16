/* ============================================================
   AMPLI · CONFIGURACIÓN ÚNICA DEL SITIO (Limly LLC)
   Es el ÚNICO archivo que se edita. La web funciona aunque
   todo esté vacío: sin cuentas, Ampli Desk abre directo y los
   formularios llegan por correo a contactEmail.
   ============================================================ */
window.AMPLI_CONFIG = {
  // 1. BACKEND de cuentas y datos: "firebase" (recomendado) o "supabase".
  //    Si los datos de abajo están vacíos, la web funciona sin cuentas.
  backend: "firebase",

  // 1A. FIREBASE → ⚙ Configuración del proyecto → Tus apps → Web (</>)
  firebase: {
    apiKey: "",             // ej.: "AIzaSy..."
    authDomain: "",         // ej.: "ampli-limly.firebaseapp.com"
    projectId: "",          // ej.: "ampli-limly"
    appId: ""               // ej.: "1:1234567890:web:abc123"
  },

  // 1B. SUPABASE (solo si backend = "supabase") → Project Settings → API
  supabaseUrl: "",
  supabaseAnonKey: "",

  // 2. DOMINIO PÚBLICO del sitio, sin barra final (lo da Vercel)
  siteUrl: "",              // ej.: "https://ampli.vercel.app"

  // 3. CUENTAS (solo aplican cuando el backend está configurado)
  requireLogin: true,         // Ampli Desk pide cuenta
  requireEmailVerified: true, // con correo: hay que activar la cuenta desde el email
  googleLogin: true,          // botón "Continuar con Google"

  // 4. POLAR: Checkout Links (https://buy.polar.sh/polar_cl_...)
  //    Vacíos = el botón de compra lleva al formulario para reservar el lugar.
  polar: {
    kit: "",                // Kit de Apelaciones IA · $29
    cohort: "",             // Cohorte fundadora · $79
    pilot: ""               // Piloto de recuperación para clínicas · $199
  },

  // 5. CONTACTO Y DATOS LEGALES (Ampli es una marca de Limly LLC)
  contactEmail: "manyosa@limly.io", // recibe los formularios mientras no haya base de datos
  seatsLeft: 10,
  legalEntity: "Limly LLC",
  legalState: "Delaware",
  legalAddress: "8 The Green, Suite B, Dover, DE 19901, USA",
  legalUpdated: "2026-11-16"
};
