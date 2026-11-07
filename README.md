# Whiskers

A booking website for a cat care business. Visitors browse the services, pick a date and time on a
calendar, and book an appointment that is saved by an API.

It is a concept project: the business details (services, hours, phone, email, address) are placeholders.

<p align="center">
  <img src="docs/screenshots/home-desktop.jpg" alt="The Whiskers home page: a teal hero with a white kitten, headline and booking button" width="100%">
</p>
<p align="center">
  <img src="docs/screenshots/booking-desktop.jpg" alt="The booking page with a service chosen, a calendar, time slots and a summary panel" width="100%">
</p>
<p align="center">
  <img src="docs/screenshots/home-mobile.jpg" alt="The home page on a phone" width="240">
  &nbsp;&nbsp;
  <img src="docs/screenshots/booking-mobile.jpg" alt="The booking page on a phone" width="240">
</p>

## Highlights

- **A real booking flow:** choose a service, pick a date and time, enter your details, get a confirmation.
- **Rules enforced on the server, not just in the browser:**
  - open Monday to Saturday, 9:00 to 12:00 and 13:00 to 18:00, in 30-minute slots
  - a service must finish before lunch or closing (a 90-minute groom cannot start at 11:00)
  - no double bookings, including overlaps between services of different lengths
  - no bookings in the past or more than 90 days ahead
  - if two people pick the same time, one gets a clear "just taken" message and the slots refresh
- **Responsive and accessible:** works from phone to desktop, with keyboard support, labelled form fields,
  visible focus, and screen reader announcements for errors and confirmations.
- **Tested:** 21 Angular tests and 32 .NET tests, including integration tests that run the real API in memory.

## Tech

| Part | Stack |
| --- | --- |
| Frontend | Angular 21 (standalone components, signals, reactive forms, lazy-loaded routes), TypeScript, SCSS |
| Backend | ASP.NET Core 10 Web API, Entity Framework Core (migrations), SQLite |
| Testing | Vitest, xUnit, `WebApplicationFactory` |
| Design | Figma (design tokens carried into the code as CSS variables) |

## What is in this repository

| Folder | What it is |
| --- | --- |
| [`whiskers-web/`](whiskers-web) | **The current site:** the Angular app (`client/`), the .NET API (`api/`) and its tests (`api.tests/`). Start here. |
| `src/`, `index.html`, `package.json` | The original React + Vite prototype this project started from. Kept for history. |
| `docs/screenshots/` | The images above. |

## Run it

You need [Node.js](https://nodejs.org) 22 or newer and the [.NET 10 SDK](https://dotnet.microsoft.com/download).
Open two terminals:

```bash
# 1. The API (creates a local SQLite database on first run)
cd whiskers-web/api
dotnet run --launch-profile http

# 2. The website
cd whiskers-web/client
npm install --legacy-peer-deps
npm start
```

Then open <http://localhost:4200>.

The full guide, API reference and design decisions are in [`whiskers-web/README.md`](whiskers-web/README.md).

## Not built yet

- Email confirmations (bookings are saved, but no email is sent)
- Staff login and an admin view of bookings, plus cancelling and rescheduling
- The About and Store pages (they show a placeholder)
- Deployment

## Credits

Photos are free stock photos. Icons are drawn as inline SVG. Fonts are
[Racing Sans One](https://fonts.google.com/specimen/Racing+Sans+One) and
[DM Sans](https://fonts.google.com/specimen/DM+Sans) from Google Fonts.
