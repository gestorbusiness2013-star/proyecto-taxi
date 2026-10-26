# 🚖 Proyecto Taxi (Venezuela)

> **PWA Mobile-First** de viajes compartidos e interurbanos en Venezuela. Rutas seguras entre Caracas, Valencia, Maracay, Barquisimeto, Puerto Ordaz y más, con mapa en vivo estilo Flightradar24, trazado vial de la Autopista Regional del Centro (ARC), seguimiento GPS en tiempo real y emisión de boletos con PIN de abordaje seguro.

---

## 🚀 1. Instalación y Ejecución Local

### Prerrequisitos
- **Node.js** v18 o superior
- **npm**, **pnpm** o **yarn**

### Comandos de inicio rápido
```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd "PROYECTO TAXI"

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local

# 4. Iniciar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

### Scripts disponibles
- `npm run dev`: Inicia el servidor de desarrollo local con Turbopack.
- `npm run typecheck`: Realiza la verificación estricta de tipos de TypeScript (`tsc --noEmit`).
- `npm run build`: Genera el build optimizado de producción.
- `npm run start`: Inicia el servidor de producción local.
- `npm run lint`: Ejecuta el análisis estático de código con ESLint.

---

## ☁️ 2. Conexión y Despliegue en Vercel vía Git

1. **Sube tus cambios a tu repositorio Git** (GitHub, GitLab o Bitbucket):
   ```bash
   git add .
   git commit -m "feat: ready for vercel deployment"
   git push origin main
   ```

2. **Importa el proyecto en Vercel**:
   - Inicia sesión en [Vercel](https://vercel.com).
   - Haz clic en **"Add New..."** → **"Project"**.
   - Conecta tu cuenta de Git y selecciona el repositorio **`proyecto-taxi`**.
   - En **Framework Preset**, Vercel detectará automáticamente **Next.js**.
   - En **Root Directory**, déjalo como `./` (raíz).

3. **Haz clic en "Deploy"**:
   - Vercel ejecutará automáticamente `npm run build` y creará la URL pública de producción con certificado SSL y CDN global.

---

## 🔑 3. Variables de Entorno en el Panel de Vercel

Antes o después del despliegue, ve a:
**Panel de Vercel → Tu Proyecto → Settings → Environment Variables** y añade las siguientes variables (puedes seleccionarlas para *Production*, *Preview* y *Development*):

| Variable | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Pública | API Key del proyecto Firebase | `AIzaSyA...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Pública | Dominio de Auth de Firebase | `proyecto-taxi-ve.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Pública | Project ID de Google Cloud / Firebase | `proyecto-taxi-ve` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Pública | Storage bucket de Firebase | `proyecto-taxi-ve.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Pública | ID de mensajería Cloud Messaging | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Pública | Identificador único de la app Web | `1:123456789012:web:...` |
| `NEXT_PUBLIC_APP_URL` | Pública | URL canónica de la PWA en producción | `https://proyecto-taxi.vercel.app` |

> [!NOTE]
> Si no configuras las credenciales de Firebase en un inicio, la aplicación cuenta con un **sistema de datos en tiempo real con fallback resiliente** para demostraciones y navegación fluida sin romper el build estático.

---

## 📱 4. Características Principales de la PWA

- **PWA Instalable**: Manifiesto web (`manifest.json`) y Service Worker optimizado (`sw.js`) con soporte *offline* para carreteras y túneles sin cobertura.
- **Sin bloqueos en Server Actions**: El Service Worker cuenta con filtros de derivación para no interceptar peticiones de `Next-Action`, `RSC` o APIs internas.
- **Mapa en Vivo Estilo Flightradar**: Integración de Leaflet con la capa cartográfica **Esri World Dark Gray Canvas** (100% libre sin marcas de agua ni API Keys) y vehículos *Top-Down GPS* con animación de rumbo (*heading*) y radar en vivo.
- **Reserva Atómica y Boletos**: Transacciones atómicas de puestos con generación de PIN de abordaje de 4 dígitos y enlace directo a WhatsApp.
- **Panel de Choferes**: Validación de abordaje por PIN, monitor de ruta activa y conmutador de estados en carretera.
