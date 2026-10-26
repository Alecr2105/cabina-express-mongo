# Cabina

API del centro cultural: salas de ensayo, bandas, músicos, reservas y préstamo de equipo.
Express + MongoDB (Mongoose). Solo backend, todas las respuestas son JSON.

## Integrantes

- Alejandro Corrales Rivera
- Samuel Fernández

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

Las transacciones necesitan un replica set, por eso se usa Atlas (un cluster de Atlas ya es replica set). Con un MongoDB local suelto las transacciones fallan.

## Postman

En la carpeta `postman/` están la colección `Cabina` y su environment. Se importan los dos, se selecciona el environment `Cabina` y se corren las carpetas en orden: salas, bandas, músicos, equipo, reservas, consultas y errores. Los requests de creación guardan los ids en el environment.

## Índices

- `Room.name`, `Band.name`, `Musician.email`, `Equipment.name`: únicos. Evitan duplicados (responden 409) y sirven para la búsqueda por nombre en los listados.
- `Booking { room, date, startHour }`: horario del día de una sala. Lo usa `GET /api/rooms/:id/schedule` (filtra por sala y fecha y ordena por `startHour`) y la consulta de traslape al crear o editar una reserva.
- `Loan { booking }`: préstamos de una reserva. Se usa en el detalle de la reserva y al cancelarla para devolver el equipo.
- `Loan { equipment, status }`: préstamos de un equipo según su estado, por ejemplo `GET /api/loans?equipment=...&status=prestado`.
- `Musician { band }`: músicos de una banda. Lo usan `GET /api/bands/:id/musicians`, el filtro `?band=` del listado, el conteo de músicos activos al reservar y el borrado protegido de la banda.

## Transacción

Está en `src/controllers/bookings.js`:

- `create` (`POST /api/bookings`): abre una sesión con `mongoose.startSession()` y dentro de `session.withTransaction()` revisa las reglas de la reserva y el traslape (`checkRules`), revisa que cada equipo pedido quepa en `availableUnits`, crea el `Booking`, crea un `Loan` en estado `prestado` por cada equipo y descuenta las unidades con `$inc: { availableUnits: -units }`.
- `cancelBooking` (la usan `PATCH /api/bookings/:id/cancel` y el `PUT` cuando se manda `status: "cancelada"`): dentro de otra transacción pasa el `Booking` a `cancelada`, regresa las unidades con `$inc: { availableUnits: units }` y pasa los préstamos a `devuelto`.

Colecciones que toca: `bookings`, `loans` y `equipment`. Si cualquier paso falla se lanza un error, la transacción se aborta y no queda una reserva sin su equipo ni equipo descontado sin reserva. Confirmar una reserva no mueve el inventario.

Cómo probamos el 409: en la carpeta `errores` de Postman, el request "Equipo de más de lo disponible" pide 50 unidades de un equipo que tiene 4 libres. Responde 409 y después en `GET /api/equipment/:id` las unidades siguen iguales y en `GET /api/bookings` no aparece la reserva. También "Borrar equipo prestado" responde 409 porque ese equipo tiene unidades en una reserva activa.
