# ComparaAutos MVP

Comparador de autos eléctricos, híbridos y PHEV para el mercado chileno. Permite filtrar por lo que le importa a un comprador real (asientos, airbags, transmisión, garantía, tipo de motor), simular costo por km / crédito / seguro y capturar el contacto para enviárselo al concesionario.

**Alcance de este MVP a propósito:** no procesa seguros ni créditos reales — solo simula. Eso evita necesitar licencias reguladas (corredora de seguros, intermediación financiera) mientras se valida si el modelo de leads funciona.

## Stack

- Backend: Node.js + Express
- Almacenamiento: archivos JSON (`data/cars.json`, `data/leads.json`) — sin base de datos externa, pensado para correr en un hosting simple (VPS de ~US$20/mes)
- Frontend: HTML + CSS + JavaScript vanilla, sin build step
- Auth del panel admin: Basic Auth simple vía variables de entorno

## Estructura del proyecto

```
comparaautos-mvp/
├── server.js              # punto de entrada Express
├── routes/
│   ├── public.js          # GET /api/cars, POST /api/leads
│   └── admin.js           # rutas protegidas: leads + CRUD de autos
├── data/
│   ├── store.js           # capa de acceso a los JSON
│   ├── cars.json           # catálogo (editable desde /admin.html)
│   └── leads.json          # leads capturados
├── public/
│   ├── index.html          # catálogo + filtros + comparador + simuladores
│   ├── admin.html          # panel de leads e inventario
│   ├── css/styles.css
│   └── js/
│       ├── app.js
│       └── admin.js
└── .env.example
```

## Cómo correrlo localmente

```bash
npm install
cp .env.example .env
# edita .env y cambia ADMIN_USER / ADMIN_PASS
node server.js
```

Abre `http://localhost:3000` para el catálogo y `http://localhost:3000/admin.html` para el panel de administración.

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `ADMIN_USER` | Usuario del panel admin | `admin` |
| `ADMIN_PASS` | Contraseña del panel admin | — (cámbiala) |

## Cómo agregar o editar autos

Dos formas:
1. **Panel admin** (`/admin.html` → pestaña Inventario): agrega, edita o elimina modelos desde el navegador.
2. **Directo en el JSON** (`data/cars.json`): útil para cargar muchos modelos de una vez.

Campos según tipo de vehículo:
- **BEV**: usa `kwh100` (consumo eléctrico cada 100 km)
- **HEV**: usa `kml` (kilómetros por litro)
- **PHEV**: usa `evKwh100`, `evRange` (km en modo 100% eléctrico) y `kml` (modo combustión)

## Cómo revisar los leads

Panel admin → pestaña Leads. Cada lead muestra nombre, teléfono, email, comuna, mensaje y el auto de interés, con un estado editable (nuevo / contactado / vendido / descartado) para hacer seguimiento manual mientras no haya CRM.

## Deploy en un VPS simple (~US$20/mes)

1. Sube el proyecto al servidor (git clone o rsync).
2. `npm install --production`
3. Crea el archivo `.env` con tus credenciales reales.
4. Usa un gestor de procesos para mantenerlo corriendo, por ejemplo [PM2](https://pm2.keymetrics.io/):
   ```bash
   npm install -g pm2
   pm2 start server.js --name comparaautos
   pm2 save
   pm2 startup
   ```
5. Pon un proxy (Nginx o Caddy) delante para servir con HTTPS y tu dominio.

## Roadmap (fuera del alcance de este MVP)

- Cotización real de seguros (requiere ser corredora o afiliarse a una existente)
- Tramitación real de crédito con bancos/financieras
- Agendamiento de test drive
- Historial de patente para usados
- Score de seguridad automatizado (hoy `safetyStars` se carga a mano desde Latin NCAP)

## Nota sobre los datos precargados

Los precios y consumos en `cars.json` son referenciales (agosto 2026), pensados para partir con un catálogo demostrable. Antes de mostrarlo a un concesionario real, actualiza los precios, agrega fotos reales y confirma el nombre del concesionario (`dealerName`, `dealerCity`) para cada modelo.
