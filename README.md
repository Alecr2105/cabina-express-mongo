# Cabina

API del centro cultural: salas de ensayo, bandas, músicos, reservas y préstamo de equipo.
Express + MongoDB (Mongoose). Solo backend, todas las respuestas son JSON.

## Integrantes

- Alejandro Corrales Rivera
- (compañero)

## Instalación

```bash
npm install
cp .env.example .env   # y completar MONGODB_URI
npm run dev
```

## .env

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto 3000) |
| `MONGODB_URI` | String de conexión de MongoDB Atlas |

## Índices

- `Room.name`, `Band.name`, `Musician.email`, `Equipment.name`: únicos; evitan duplicados y aceleran la búsqueda por ese campo.
- `Booking { room, date, startHour }`: horario del día de una sala; sirve para detectar traslapes y para `GET /api/rooms/:id/schedule`.
- `Loan { booking }`: préstamos de una reserva.
- `Loan { equipment, status }`: préstamos prestados/devueltos de un equipo.
- `Musician { band }`: músicos de una banda.

## Transacción

_Pendiente: explicar en qué funciones está, qué colecciones toca y cómo se probó el 409._

## Estado del avance (~60%)

Hecho:
- [x] Configuración, conexión y manejo de errores JSON (400, 404, 409)
- [x] Seis modelos con validaciones, virtual `durationHours` e índices
- [x] Helper de paginación, orden y búsqueda (`src/utils/paginate.js`)
- [x] CRUD de salas (con `schedule`), bandas, músicos y equipo, con borrados protegidos (409)
- [x] `GET /api/loans` y `GET /api/loans/:id`
- [x] `GET /api/bookings` (filtros `status`, `room`, `band`, `date`, `from`, `to`) y `GET /api/bookings/:id`
- [x] Los tres `aggregate`: `/api/bookings/stats`, `/api/rooms/stats`, `/api/equipment/stats`

Pendiente:
- [ ] **bookings**: `POST /`, `PUT /:id` y `PATCH /:id/cancel` (hay TODOs en `controllers/bookings.js` y `routes/bookings.js`)
- [ ] Reglas de negocio de la reserva (horas, máx. 3 h, fecha, sala disponible, banda activa con músicos, cupo, traslape, cambios de estado)
- [ ] Transacciones (`startSession` + `withTransaction`) al crear y cancelar, con `$inc` sobre `availableUnits`
- [ ] Colección y environment de Postman (carpetas, examples, tests, consultas y errores)
- [ ] Completar la sección Transacción de este README
- [ ] Probar todo contra MongoDB Atlas (lo hecho hasta ahora solo se probó sin base de datos)
