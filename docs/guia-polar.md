# Guía Polar · Ampli (Limly LLC)

Paso a paso para crear los 3 productos de Ampli en Polar y obtener los links de pago que van en la web. Tiempo estimado: 45 minutos. Al terminar, envía los 3 links que empiezan con `https://buy.polar.sh/polar_cl_`.

## 0. Antes de empezar

Ten a mano:

- [ ] Carta del IRS con el EIN de Limly LLC (CP 575 B)
- [ ] Cuenta bancaria de EE.UU. a nombre de Limly LLC (Mercury, Relay u otra)
- [ ] Documento de identidad de Michell (miembro de la LLC) para la verificación de Stripe
- [ ] Logo 1:1: `ampli-1x1-simbolo-cobalto-1080.png`
- [ ] El archivo del kit (PDF o ZIP) para el producto de $29
- [ ] El link del grupo de la cohorte (WhatsApp, Discord o Telegram) y el calendario de sesiones
- [ ] El dominio de la web publicada (por ejemplo `https://ampli-web.pages.dev`)

Trabaja primero en **sandbox.polar.sh** (pruebas sin dinero real) y repite todo en **polar.sh** cuando funcione. Son cuentas independientes: lo que crees en sandbox no pasa solo a producción.

## 1. Crear la organización

1. Entra a polar.sh → **Get started** → regístrate con el correo de la empresa.
2. Crea la organización:

| Campo | Valor |
| --- | --- |
| Nombre | Ampli |
| Slug (URL) | ampli |
| Logo | ampli-1x1-simbolo-cobalto-1080.png |
| Sitio web | URL de la web publicada |
| Correo de soporte | manyosa@limly.io (o el correo real que uses) |

3. En **Settings**, descripción: "Ampli forma operadores bilingües que apelan reclamos médicos negados en EE.UU. con IA y verificación humana. Marca de Limly LLC."

## 2. Conectar los pagos de Limly LLC

1. **Finance → Payouts** (o **Settings → Finance**) → conectar Stripe.
2. Tipo de cuenta: **Company / LLC**.

| Campo de Stripe | Dato |
| --- | --- |
| Nombre legal | Limly LLC |
| EIN | El de la carta CP 575 B |
| Dirección registrada | 8 The Green, Suite B, Dover, DE 19901, USA |
| Estado de constitución | Delaware |
| Representante | Michell Alfonso Anyosa Cornelio (miembro) |
| Sitio web | URL de la web publicada |
| Descripción del negocio | Formación en línea y software para gestión de reclamos médicos |

3. Agrega la cuenta bancaria de EE.UU. de la LLC.
4. Polar revisa la organización antes de liberar pagos. Hazlo primero: la revisión puede tardar.

**Importante:** el piloto de $199 para clínicas es un servicio, no un producto digital. Revisa la política de uso aceptable de Polar. Si no lo aceptan, el piloto se cobra con Stripe Invoicing directo desde Limly LLC y en la web solo cambia ese link.

## 3. Crear los 3 productos

En **Products → New Product**, crea cada uno con estos datos.

### Producto 1 · Kit de Apelaciones IA ($29)

| Campo | Valor |
| --- | --- |
| Name | Kit de Apelaciones IA · AI Appeals Kit |
| Pricing | One-time purchase · Fixed price · 29.00 USD |
| Media | ampli-1x1-simbolo-cobalto-1080.png |
| Benefit | **File Downloads** → sube el PDF o ZIP del kit |

Descripción para pegar:

> 22 plantillas de cartas de apelación para los códigos de rechazo más comunes en EE.UU., prompts verificados para Claude o ChatGPT y un checklist de verificación humana imprimible. En español e inglés. Producto digital: el enlace de descarga llega a tu correo apenas pagas.
>
> 22 appeal letter templates for the most common US denial codes, verified prompts for Claude or ChatGPT and a printable human-verification checklist. Digital product: the download link arrives by email right after payment.

### Producto 2 · Cohorte fundadora ($79)

| Campo | Valor |
| --- | --- |
| Name | Cohorte fundadora Ampli · Founding cohort |
| Pricing | One-time purchase · Fixed price · 79.00 USD |
| Media | ampli-1x1-vertical-cobalto-1080.png |
| Benefit | **Custom** → nota privada (abajo) |
| Límite | Si Polar lo permite, máximo 10 ventas; si no, desactiva el link al llegar a 10 |

Descripción para pegar:

> Aprende en 3 semanas a apelar reclamos médicos negados en EE.UU. con IA y un método que un experto revisa. 6 sesiones en vivo (martes y jueves, 8 p. m. hora de Lima, Bogotá y Nueva York), grabadas. Incluye Ampli Desk, casos prácticos anonimizados y certificado con ID verificable. Requisitos: inglés B2 y 6 horas por semana. No prometemos empleo ni ingresos.

Nota privada del beneficio (la ve solo quien paga):

> ¡Te damos la bienvenida a la cohorte fundadora! Únete al grupo: [LINK DEL GRUPO]. Calendario: [LINK O FECHAS]. Crea tu cuenta en Ampli Desk con este mismo correo: [URL]/app/. ¿Dudas? manyosa@limly.io

### Producto 3 · Piloto de recuperación para clínicas ($199)

| Campo | Valor |
| --- | --- |
| Name | Recovery Pilot · Piloto de recuperación |
| Pricing | One-time purchase · Fixed price · 199.00 USD |
| Media | ampli-1x1-simbolo-blanco-1080.png |
| Benefit | **Custom** → nota privada (abajo) |
| Custom fields | Practice name (texto, obligatorio) · State (texto, obligatorio) · Phone (texto, opcional) |

Campos personalizados: **Settings → Custom Fields → New**, y luego actívalos en este producto.

Descripción para pegar (en inglés, porque compra una clínica de EE.UU.):

> We review up to 20 of your denied claims, tell you which ones are worth appealing, and deliver an audit report by denial code plus ready-to-send appeal letters. Our AI-assisted operators verify every letter with an 8-point human checklist. We never ask for patient data by email: we review it with you securely.

Nota privada del beneficio:

> Thank you! We'll email you within one business day to schedule the review. Please don't send patient information by email. Questions: manyosa@limly.io

## 4. Crear los links de pago

En cada producto: menú **⋯** → **Create Checkout Link** (o **Checkout Links → New**).

| Producto | Label | Allow discount codes | Success URL |
| --- | --- | --- | --- |
| Kit | web-kit | Sí | `https://TU-SITIO/gracias.html?p=kit&checkout_id={CHECKOUT_ID}` |
| Cohorte | web-cohort | Sí | `https://TU-SITIO/gracias.html?p=cohort&checkout_id={CHECKOUT_ID}` |
| Piloto | web-pilot | No | `https://TU-SITIO/gracias.html?p=pilot&checkout_id={CHECKOUT_ID}` |

Reemplaza `TU-SITIO` por el dominio real. Deja `{CHECKOUT_ID}` tal cual: Polar lo reemplaza solo.

Copia la URL del **Checkout Link** (empieza con `https://buy.polar.sh/polar_cl_`). No copies la URL de una sesión de pago abierta: esa caduca.

La web agrega sola el correo y el nombre del cliente si tiene sesión iniciada, y el cupón si llegó con `?cupon=CODIGO`.

## 5. Crear los cupones

**Products → Discounts → New Discount**:

| Código | Tipo | Valor | Aplica a | Límite sugerido |
| --- | --- | --- | --- | --- |
| LATAM25 | Porcentaje | 25% | Kit y Cohorte | 20 usos |
| BR25 | Porcentaje | 25% | Kit y Cohorte | 20 usos |
| AFRIQUE40 | Porcentaje | 40% | Kit y Cohorte | 10 usos |

No los publiques: compártelos por DM o con el link `https://TU-SITIO/?cupon=LATAM25`.

## 6. Probar

1. En sandbox, abre cada link y paga con la tarjeta de prueba `4242 4242 4242 4242`, fecha futura y cualquier CVC.
2. Verifica que vuelves a la página de gracias con el producto correcto.
3. Verifica que llega el correo de Polar con el beneficio (descarga o nota privada).
4. Prueba un cupón.
5. Repite los pasos 1 a 5 en **polar.sh** (producción).

## 7. Lo que hay que enviar a Claude

- [ ] Link del Kit: `https://buy.polar.sh/polar_cl_...`
- [ ] Link de la Cohorte: `https://buy.polar.sh/polar_cl_...`
- [ ] Link del Piloto: `https://buy.polar.sh/polar_cl_...`
- [ ] Nombres finales de los cupones, si cambiaron

## 8. Después de cada venta

- **Kit:** Polar entrega la descarga solo.
- **Cohorte:** agrega a la persona al grupo si no entró sola y regístrala en la lista de la cohorte.
- **Piloto:** responde en menos de 24 horas para agendar la revisión.
- **Reembolsos** (según los Términos de la web): cohorte, hasta antes de la segunda sesión; kit, dentro de 7 días si no se descargó; piloto, si la revisión no empezó. Se hacen desde **Sales → Orders → Refund**.
