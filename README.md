# USAL School Calendar

A browser-based calendar for a school. Users sign in and submit events. Approvers review the submissions and
manage events and users. The calendar has a month view and a day view.

- **Client:** React 19, TypeScript, Vite, React Router, TanStack Query, React Bootstrap, react-hook-form and zod
- **Server:** ASP.NET Core 10 Web API (C#) with JWT authentication and BCrypt password hashing
- **Database:** SQLite through Entity Framework Core 10 (migrations are applied and demo data is seeded automatically)
- **Tests:** xUnit (unit and API integration tests) and Vitest with React Testing Library

---

## Prerequisites

| Tool | Version |
|---|---|
| [.NET SDK](https://dotnet.microsoft.com/download) | 10.0 |
| [Node.js](https://nodejs.org/) | 22 LTS or newer (developed with Node 24) |
| Browser | Chrome or Edge |
| Editor | Visual Studio Code (the C# Dev Kit extension is recommended) |

You don't need to install a database server: SQLite is a file that is created on first run.

## Setup (first time only)

From the repository root:

**1. Set the JWT signing key.** The key is kept in .NET user secrets, so it never ends up in the repository.
The API won't start without it. Use any random string of at least 32 characters:

```bash
dotnet user-secrets set "Jwt:SigningKey" "replace-with-a-random-string-of-32-or-more-characters" --project server/UsalCalendar.Api
```

**2. Install the client packages:**

```bash
cd client
npm install
```

## Run

Use two terminals, both starting at the repository root.

**Terminal 1: API** (http://localhost:5080)

```bash
dotnet run --project server/UsalCalendar.Api
```

Use `dotnet watch --project server/UsalCalendar.Api` instead to restart the API automatically when the code changes.

On startup, in the Development environment (the default launch profile), the API creates the database
`server/UsalCalendar.Api/usalcalendar.db`, applies the migrations, and seeds the demo data if the database is empty.

**Terminal 2: client** (http://localhost:5173)

```bash
cd client
npm run dev
```

**Open http://localhost:5173 in Chrome or Edge.** The Vite dev server compiles the TypeScript and forwards every
`/api` request to the API on port 5080, so the browser only talks to port 5173.

### Building the client (transpiling)

The client is written in TypeScript and JSX, which browsers can't run directly. `npm run dev` compiles it on the fly.
To make a production build (type-check, then bundle into `client/dist`):

```bash
cd client
npm run build
```

### Resetting the demo data (optional)

Not needed to run the app. Do this only if you want a fresh start, for example after a demo changed or deleted
events. Stop the API, delete `server/UsalCalendar.Api/usalcalendar.db` (and the `-shm` and `-wal` files next to it, if
present), then start the API again. The seeded events are placed relative to the current month, so the calendar
always has something to show.

## Demo accounts

| Login name | Password | Role |
|---|---|---|
| `admin` | `Admin123!` | Approver (Thompson, Margaret A) |
| `approver2` | `Pass123!` | Approver (Garcia, Robert J) |
| `jsmith` | `Pass123!` | User (Smith, John Michael) |
| `mjones` | `Pass123!` | User (Jones, Maria) |
| `ssquarepants` | `Pass123!` | User (Squarepants, Spongebob) |

The seed data includes approved events across this month and next, five pending submissions, and one day (the
26th of the current month) that already has 10 approved events, plus a pending "Movie Night" on that day. Use it to
see the daily limit in action.

### A quick tour

1. Sign in as **jsmith** and create an event. It shows on the calendar grayed out and italic, as "Pending".
   Open the day view: you can withdraw your own pending submission.
2. Sign in as **admin** and open **Approvals**. Approve the event, and it becomes a normal event on the calendar.
   Try approving "Movie Night": it's refused because that day already has 10 approved events.
3. As **admin**, create an event. It goes straight onto the calendar, with no approval step.
4. As **admin**, use **Events** to search, filter, view, edit and delete events, and **Users** to create, edit and
   delete users.

## Tests

```bash
# Server: unit tests and API integration tests (each test run uses its own temporary SQLite database)
dotnet test

# Client: component and validation tests
cd client
npm test
```

Stop the API before running `dotnet test`. Otherwise the build fails with *"file is locked by: UsalCalendar.Api"*,
because the running API holds the compiled files open.

Other client scripts: `npm run lint` (oxlint) and `npm run test:watch`.

---

## Project structure

```
client/                        React app
  src/app/                     Layout, routes, breadcrumbs, providers
  src/features/                One folder per feature: auth, calendar, events, approvals, users
  src/shared/                  API client, shared components, validation patterns
server/
  UsalCalendar.Core/           Entities, business rules and services. Has no dependencies on the other projects.
  UsalCalendar.Infrastructure/ EF Core DbContext, migrations, repositories, seed data, password hashing
  UsalCalendar.Api/            Controllers, request/response DTOs, JWT setup, error handling
tests/UsalCalendar.Tests/      xUnit unit tests (Core services) and integration tests (real HTTP and SQLite)
```

Controllers are kept thin. Business rules (approval, the daily limit, deletion rules) live in the Core services, so
they're tested without a web server or database. Errors map to HTTP statuses in one place: not found → 404,
not allowed → 403, business rule broken → 409, invalid input → 400. All error responses use the standard
ProblemDetails format, and the client shows their message.

## How the requirements are met

| Requirement | Where |
|---|---|
| Sign in | Login page. The JWT is checked on every request, and the user is re-read from the database each time |
| Submit events for approval | **New event** on the Calendar. Normal users' events are pending (two steps) |
| Approvers add events directly | Approvers' new events are approved immediately (one step) |
| Review, approve or delete submissions | **Approvals** page (approvers only) |
| Month view: time, title, location; scroll by month | Calendar, Month view, with Previous/Next/Today |
| Day view: time, title, location, description, creator; scroll by day | Calendar, Day view. Click a day or use the Month/Day toggle |
| Same-day events in ascending time order | Sorted by the server and kept in that order by the client |
| CRUD for events (only approvers edit) | **Events** list, details, edit and delete pages, plus Edit/Delete in the Day view |
| CRUD for users (approvers only) | **Users** page |
| Names shown as "Last, First Middle" | Formatted once, on the server |
| Event fields, plus created and approved timestamps | Stored in UTC and shown on the event details page |
| Validations V1–V6 | Checked on the server (request DTOs) and in the forms (zod schemas) |
| V8: two security levels | `Approver` authorization policy on the server, plus route guards in the client |
| V9: at most 10 approved events per day | Checked when approving, when an approver creates an event, and when an approved event is moved |
| SQL database, seeded with approved and unapproved events | SQLite through EF Core, seeded on first run |
| Automated tests | xUnit (server) and Vitest (client) |

Optional features (drag and drop, managing locations, event images) aren't implemented.

## Design decisions

The specification doesn't cover the points below. Where a product decision was needed, it's marked.

- **Pending events on the calendar.** They show grayed out and italic with a "Pending" label. Normal users see only their own pending events and able to withdraw them (Confirmed with Kathy); approvers see all of them.
- **Withdraw and delete are one endpoint** (`DELETE /api/events/{id}`). The server decides who may do it:
  approvers can delete any event, and creators can withdraw only their own *pending* events. The UI calls it
  "Withdraw" for normal users.
- **No past dates.** Events can't be created on, or moved to, a date before today. Today is allowed. "Today" means
  the school's date, set with `School:TimeZone` in `server/UsalCalendar.Api/appsettings.json`, not UTC. An event that
  already happened can still be edited, as long as its date doesn't change.
- **Deleting users (confirmed with Kathy).** A user with no events is removed. A user who has events,
  as creator or approver, is *deactivated* instead. They can't sign in and no longer appear in the Users list, but
  their events stay, shown as "Last, First Middle (deactivated)". Their pending submissions also stay in Approvals, so an
  approver can still approve or delete them. A deleted user's login name can't be reused, so names on old events
  stay unambiguous.
- **Approvers can't be deleted directly.** Their approver role has to be removed first, which makes it a two-step,
  deliberate action. Nobody can delete themselves or remove their own approver role, so there is always at least
  one approver.
- **Access is re-checked on every request.** The API reads the user from the database for each request. A deleted
  user is signed out on their next action (401), and a demoted approver loses approver access immediately (403),
  even though their token hasn't expired.

## Known limitations and future work

- **Concurrent approvals.** 
- **The token is stored in `localStorage`.** This is simple and for demo purposes only. A production app would use an HttpOnly cookie, so injected scripts can't read the token.
- **Events page search runs in the browser,** on the events already loaded. If the list gets paginated, search must move to the server.
- **No pagination** on the Events page yet. It's fine for lets say a hundrend events, but it will need pagination (and an "upcoming / past" filter) as data grows over the years.
- **Development setup only.** Migrations and seeding run only in the Development environment, and the JWT issuer
  settings live in `appsettings.Development.json`. A production deployment would need its own configuration, HTTPS,
  and the API serving the built client.
- **Ideas for later:** drag and drop to move events, managing locations, event images, and an explicit
  deactivate/reactivate switch for users.
