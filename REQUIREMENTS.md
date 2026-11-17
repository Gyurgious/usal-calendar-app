# USAL School Calendar App: Requirements & Design Spec

A browser-based application for maintaining a school-wide calendar. Normal users submit events for approval. Approvers review, approve, edit and delete events, and manage users.

---

## 1. Technical Stack

| Layer | Requirement (from exercise) | Chosen technology |
|---|---|---|
| Frontend | JavaScript framework (Vue / React / Angular) | **React 19 + TypeScript + Vite** |
| UI / CSS | Any CSS library | **Bootstrap 5** (or Tailwind) |
| Backend | C# | **ASP.NET Core 10 Web API (controllers)** |
| Data access | Any (EF, NHibernate, ADO…) | **Entity Framework Core 10** |
| Database | SQL database | **SQLite** (zero-install; swappable to SQL Server via connection string) |
| Auth | Sign-in screen | **JWT bearer tokens**, passwords hashed with **BCrypt** |
| Tests | Preferred, not required | **xUnit** (backend), **Vitest + React Testing Library** (frontend) |
| Runtime | Runs in VS Code, demo in Chrome/Edge | VS Code tasks/launch configs + README instructions |

---

## 2. Roles & Security

There are exactly **two security levels**:

| Capability | Normal User | Approver (Admin) |
|---|:-:|:-:|
| Sign in | ✅ | ✅ |
| View calendar (month & day views) | ✅ | ✅ |
| Submit event for approval (two-step) | ✅ | n/a |
| Add event directly to calendar (one-step, auto-approved) | ❌ | ✅ |
| View pending submissions | ❌ (own submissions only, optional) | ✅ |
| Approve / delete pending submissions | ❌ | ✅ |
| Edit / delete displayed (approved) events | ❌ | ✅ |
| Create / read / update / delete users | ❌ | ✅ |
| Drag & drop events (optional) | ❌ | ✅ |
| Manage locations (optional) | ❌ | ✅ |

Authorization must be enforced **on the server** (API policies), not only by hiding UI elements.

---

## 3. Data Model

### 3.1 User

| Field | Type | Rules |
|---|---|---|
| `Id` | int (PK) | identity |
| `FirstName` | string(25) | required, 1–25 printable chars |
| `MiddleName` | string(25) | optional, 0–25 printable chars |
| `LastName` | string(25) | required, 1–25 printable chars |
| `LogonName` | string(16) | required, **unique**, alphanumeric, 4–16 chars |
| `PasswordHash` | string | BCrypt hash. Raw password is alphanumeric + punctuation, 4–16 chars |
| `IsApprover` | bool | security flag (admin/approver) |

**Display name format:** `Last, First Middle` (e.g. `Smith, John A`). If there is no middle name: `Smith, John`.

### 3.2 Event

| Field | Type | Rules |
|---|---|---|
| `Id` | int (PK) | identity |
| `Title` | string(25) | required, printable chars, ≤ 25 |
| `Description` | string(255) | printable chars, ≤ 255 |
| `Location` | string(50) | optional, printable chars, ≤ 50 (or `LocationId` FK if optional Locations feature is built) |
| `EventDate` | date | required |
| `EventTime` | time | required |
| `CreatorId` | int (FK → User) | person who submitted the event |
| `ApproverId` | int? (FK → User) | null until approved |
| `CreatedAt` | datetime | timestamp when created |
| `ApprovedAt` | datetime? | timestamp when approved |
| `IsApproved` | bool (or derived from `ApproverId != null`) | |
| `ImageKey` | string? | optional, image/icon associated with event |

### 3.3 Location (optional feature)

| Field | Type | Rules |
|---|---|---|
| `Id` | int (PK) | identity |
| `Name` | string(50) | required, unique, printable chars, ≤ 50 |

---

## 4. Validation Rules

Validate on **both client and server**. The server is the source of truth.

| # | Field | Rule | Suggested regex |
|---|---|---|---|
| V1 | Logon name | Alphanumeric, 4–16 chars | `^[A-Za-z0-9]{4,16}$` |
| V2 | Password | Alphanumeric + punctuation, 4–16 chars | `^[\x21-\x7E]{4,16}$` (letters, digits, punctuation; no spaces) |
| V3 | First / Last name | Printable, 1–25 chars | `^[\x20-\x7E]{1,25}$` |
| V3 | Middle name | Printable, 0–25 chars | `^[\x20-\x7E]{0,25}$` |
| V4 | Location | Optional; printable, ≤ 50 chars | `^[\x20-\x7E]{0,50}$` |
| V5 | Event title | Printable, ≤ 25 chars (required) | `^[\x20-\x7E]{1,25}$` |
| V6 | Event description | Printable, ≤ 255 chars | `^[\x20-\x7E]{0,255}$` |
| V7 | Creator / Approver display | Format `Last, First Middle` | n/a |
| V8 | Security | Only two levels (Normal, Approver) | n/a |
| V9 | Daily cap | **Max 10 approved events per day** | Checked on approve, direct-create, edit (date change), and drag/drop |

Notes:
- "Printable characters" = ASCII 0x20–0x7E. Trim leading/trailing whitespace before validating required fields.
- V9 applies only to **approved** events. Pending submissions do not count toward the cap, but approving one onto a full day must fail with a clear message.

---

## 5. Required Screens

### 5.1 Sign In
- Logon name and password fields with validation.
- On success, store the JWT and route to the calendar.
- Show a clear error on invalid credentials. Provide a sign-out action in the navbar.

### 5.2 Calendar: Month View
- Grid of the month (weeks × 7 days).
- Each day shows its approved events with **time, title, location only**.
- Events sorted in **ascending time order**.
- Previous / Next / Today buttons to scroll through months.
- Clicking a day opens the **Day View** for that date.

### 5.3 Calendar: Day View
- Shows a single day's approved events with **time, title, location, description, creator** (creator formatted `Last, First Middle`).
- Events sorted in **ascending time order**.
- Previous / Next / Today buttons to scroll through days.
- Approvers see Edit / Delete actions per event.

**Toggle:** A visible Month | Day switch keeps the currently selected date when switching views.

> Fallback (BR4): if a full calendar grid is too difficult, start with a simple grid/table of events, then upgrade.

### 5.4 Submit / Create Event
- Form: title, description, location (text or dropdown if Locations feature is built), date, time, optional image.
- **Normal user** submits the event as *pending* (two-step).
- **Approver** saves the event as *approved immediately* (one-step). Approver and ApprovedAt are set to the current user and current time.

### 5.5 Pending Approvals (Approvers only)
- Table of unapproved events: title, date, time, location, description, creator, created timestamp.
- Actions: **Approve** (sets ApproverId and ApprovedAt, enforces the 10/day cap) and **Delete**.

### 5.6 Event Management (CRUD)
- List of all events with filter (approved / pending / all).
- Create, view details, edit, delete.
- Edit and delete are **approvers only**.
- Details view shows creator, approver, created timestamp and approved timestamp.

### 5.7 User Management (CRUD, approvers only)
- List users: display name (`Last, First Middle`), logon name, role.
- Create / edit user: first, middle, last, logon name, password (optional on edit), approver flag.
- Delete user. Decide on and document behavior for the user's events, e.g. block deletion if the user has events, or reassign them.
- Prevent an approver from removing their own approver flag or deleting themselves if they are the last approver.

---

## 6. Optional Features

1. **Drag & drop (approvers):** drag an event to another day in Month View. The server re-validates the 10/day cap. Revert the move on failure.
2. **Locations CRUD:** a Locations admin screen. The event form uses a dropdown instead of free text.
3. **Event images:** pick from a preset icon set (e.g. football, basketball, music, graduation, meeting) or upload one. Show it in Month and Day views.

---

## 7. REST API (proposed)

All endpoints except `/api/auth/login` require a valid JWT. 🔒 = Approver only.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Returns JWT + user info |
| GET | `/api/auth/me` | Current user |
| GET | `/api/events?from=&to=&status=approved` | Approved events in a date range (calendar) |
| GET | `/api/events/{id}` | Event details |
| POST | `/api/events` | Create. Pending if normal user, auto-approved if approver |
| PUT | `/api/events/{id}` 🔒 | Update event (re-checks daily cap) |
| DELETE | `/api/events/{id}` 🔒 | Delete event |
| GET | `/api/events/pending` 🔒 | List pending submissions |
| POST | `/api/events/{id}/approve` 🔒 | Approve (enforces daily cap) |
| PATCH | `/api/events/{id}/move` 🔒 | Drag & drop date/time change (optional) |
| GET | `/api/users` 🔒 | List users |
| GET | `/api/users/{id}` 🔒 | Get user |
| POST | `/api/users` 🔒 | Create user |
| PUT | `/api/users/{id}` 🔒 | Update user |
| DELETE | `/api/users/{id}` 🔒 | Delete user |
| GET/POST/PUT/DELETE | `/api/locations[/{id}]` | Locations CRUD (optional; writes 🔒) |

Responses that contain users return the formatted display name and **never** the password hash.

---

## 8. Seed Data

The database must be seeded on first run with:

- **Users:** at least 2 approvers and 3 normal users, e.g.
  - `admin` / `Admin123!` (Approver)
  - `approver2` / `Pass123!` (Approver)
  - `jsmith` / `Pass123!` (Normal), `mjones` / `Pass123!` (Normal), …
- **Approved events:** spread across the current month and the next, with several days having multiple events at different times to show sorting.
- **Unapproved events:** at least 5 pending submissions from normal users.
- **Locations** (if optional feature built): Gym, Football Field, Auditorium, Library, Cafeteria, Room 101…
- At least one day pre-filled with exactly 10 approved events, to demo the daily cap validation.

---

## 9. Proposed Project Structure

```
USAL Calendar App/
├── REQUIREMENTS.md
├── SETUP_GUIDE.md               # step-by-step setup (see for details)
├── README.md                    # setup & run instructions
├── UsalCalendar.slnx
├── Directory.Build.props        # shared strict compiler settings
├── .vscode/                     # tasks, launch, recommended extensions
├── server/
│   ├── UsalCalendar.Api/            # controllers, DTOs, JWT auth, error handling, Program.cs
│   ├── UsalCalendar.Core/           # entities, validation rules, services, interfaces (no deps)
│   └── UsalCalendar.Infrastructure/ # EF Core DbContext, migrations, seeder, repositories, BCrypt
├── tests/
│   └── UsalCalendar.Tests/          # xUnit unit + integration tests
└── client/                          # React + Vite + TS
    └── src/
        ├── app/                     # App, router, providers
        ├── api/                     # http client, API types
        ├── features/                # auth, calendar, events, users
        └── shared/                  # components, validation patterns, utils
```

---

## 10. Run Instructions (to be finalized in README)

Prerequisites: **.NET 10 SDK**, **Node.js 22+**, VS Code (C# Dev Kit extension recommended), Chrome or Edge.

```bash
# Backend: creates and seeds SQLite DB on first run
dotnet run --project server/UsalCalendar.Api

# Frontend: transpiled by Vite
cd client
npm install
npm run dev                # http://localhost:5173 (proxies /api to backend)

# Tests
dotnet test
cd client && npm test
```

---

## 11. Acceptance Checklist

**Required**
- [ ] Sign in / sign out with logon name + password
- [ ] Normal user can submit an event; it appears in Pending, not on the calendar
- [ ] Approver can add an event that appears on the calendar immediately
- [ ] Approver can approve or delete pending events
- [ ] Month view: time, title, location; scroll months; sorted by time
- [ ] Day view: time, title, location, description, creator; scroll days; sorted by time
- [ ] Easy toggle between month and day views
- [ ] Users CRUD (approver only)
- [ ] Events CRUD (edit/delete approver only)
- [ ] Creator/Approver shown as `Last, First Middle`
- [ ] Created and approved timestamps stored and shown
- [ ] All validations V1–V9 enforced client- and server-side
- [ ] Max 10 approved events per day enforced
- [ ] Data persisted in a SQL database, seeded with approved and unapproved events
- [ ] Runs from VS Code. Demo in Chrome/Edge
- [ ] README with build/transpile/run instructions

**Optional**
- [ ] Drag & drop event moves (approvers)
- [ ] Locations CRUD + dropdown selection
- [ ] Event images/icons shown on the calendar
- [ ] Automated backend and frontend tests
