# Whiskers

A booking website for a cat care business: a marketing home page and an appointment booking flow.
Designed in Figma first (home and booking screens, desktop and mobile), then built here.

- **Frontend:** Angular 21 (standalone components, signals, reactive forms, lazy-loaded routes), SCSS
- **Backend:** ASP.NET Core 10 Web API, Entity Framework Core, SQLite
- **Tests:** Vitest (Angular) and xUnit (.NET), 21 + 32 tests

> The business details are placeholders: the services, opening hours, phone, email and address
> are invented. Replace them before using this for real.

## What it does

- **Home page:** hero, services, about section, how booking works, call to action. Responsive from phone to desktop.
- **Booking page:**
  1. choose a service,
  2. pick a date on a calendar and a time from the open slots,
  3. enter your details.

  A summary panel updates as you choose, and a confirmation page follows a successful booking.
- **Booking rules** (enforced by the API, so they cannot be bypassed from the browser):
  - open Monday to Saturday, 9:00 to 12:00 and 13:00 to 18:00, in 30-minute slots
  - a service must finish before lunch or closing (a 90-minute groom cannot start at 11:00)
  - no double booking, including overlaps between services of different lengths
  - no booking in the past, and none more than 90 days ahead
  - if two people pick the same time, one gets a friendly 409 and the slots refresh

## Project layout

```
whiskers-web/
├── api/            ASP.NET Core Web API (controllers, EF Core models, availability rules, migrations)
├── api.tests/      xUnit unit and integration tests for the API
├── client/         Angular app
│   └── src/app/
│       ├── core/       API service, models, date helpers
│       ├── layout/     header and footer
│       ├── pages/      home, appointments (with calendar), coming-soon
│       └── shared/     icon component
└── Whiskers.slnx
```

## Run it locally

You need [Node.js](https://nodejs.org) 22 or newer and the [.NET 10 SDK](https://dotnet.microsoft.com/download).

Start the API (creates `api/whiskers.db` on first run):

```bash
cd api
dotnet run --launch-profile http        # http://localhost:5258
```

In a second terminal, start the Angular app:

```bash
cd client
npm install --legacy-peer-deps          # see the note below
npm start                               # http://localhost:4200
```

Open <http://localhost:4200>. The Angular dev server forwards `/api` to the .NET API
(see `client/proxy.conf.json`), so there are no CORS problems in development.

> **Note on `--legacy-peer-deps`:** with npm 10.9 a plain `npm install` can crash while resolving the
> test tooling ("Cannot read properties of null (reading 'edgesOut')"). The flag works around it.
> Newer npm versions may not need it.

## Run the tests

```bash
cd client && npm test -- --watch=false      # Angular, 21 tests
cd api.tests && dotnet test                 # .NET, 32 tests
```

The .NET integration tests start the real API in memory with a throwaway database and a fixed clock.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/services` | List bookable services |
| `GET` | `/api/appointments/availability?date=YYYY-MM-DD&serviceId=1` | Every slot for a day, and whether it is free for that service |
| `POST` | `/api/appointments` | Book. Returns `201`, `400` (validation) or `409` (time taken or not allowed) |
| `GET` | `/api/appointments/{id}` | Look up one booking |

In development the OpenAPI document is at `/openapi/v1.json`.

## Design decisions worth knowing

- **Times are clinic-local with no time zone.** A booking is "10:30 on 12 November at the clinic", so the
  client and API pass plain `2026-11-12T10:30:00` values and never convert through UTC.
- **The database is the last line of defence.** The availability check runs first, and a unique index on the
  start time catches two people booking in the same instant.
- **There is no endpoint that lists all appointments.** There is no login yet, so exposing customers'
  names and emails would be a privacy problem.
- **Design tokens live in `client/src/styles.scss`** and match the variables in the Figma file.
- **Form borders are slightly darker than in the Figma file** so they meet the 3:1 contrast guideline.

## Not built yet

- **Email confirmations.** A booking is saved but no email is sent. The UI says so.
- **Staff login** and an admin view of bookings, plus cancelling or rescheduling.
- **About and Store pages.** They show a placeholder.
- **Deployment.** For production, serve the built Angular app (`npm run build`) from the same host as the API,
  or set the allowed origin in `api/appsettings.json`, and swap SQLite for SQL Server or PostgreSQL by changing the
  EF Core provider and connection string.

## Images

The two photos in `client/public/images` are free stock photos. Check each photo's license page and credit the
photographers if you want to (the Unsplash License does not require it).
