# Room Ops

Room Ops, branded in the app as **CampRoomOps**, is an internal camp accommodation and room operations system. It coordinates guest intake, reservations, room allocation, check-in/check-out, field absences, security gate handoffs, documents, imports, exports, reports, and administration across one or more camps.

The application is built with Next.js App Router and Supabase. Most business workflows are enforced through authenticated server actions, protected pages, Supabase row-level security, and database RPC functions.

## Core Capabilities

- Role-based dashboards for reception, security, camp managers, executives, and system administrators.
- Room inventory by camp, building, room type, room status, and amenities.
- Guest profiles, guest categories, document upload, and document review.
- Expected arrivals, reservations, room allocation, stays, check-in, check-out, and no-show/cancellation flows.
- Security guest intake, gate entry/exit tracking, security clearance review, and reception handoff queues.
- Field absence tracking for checked-in guests leaving and returning to camp.
- CSV data imports for rooms and guests with row validation and review.
- Report exports for operational reporting, backed by Supabase Storage export jobs.
- Notifications, audit logs, user invitations, account status handling, role permissions, and camp access controls.

## Tech Stack

- **Framework:** Next.js `16.2.4` with App Router and the `src/proxy.ts` file convention.
- **UI:** React `19.2.4`, Tailwind CSS `4`, lucide-react icons, shared UI components in `src/components/ui`.
- **Forms and validation:** react-hook-form, `@hookform/resolvers`, Zod.
- **Data:** Supabase Auth, Postgres, Storage, RLS policies, SQL migrations, generated database types.
- **Tables:** TanStack Table.
- **Charts:** Recharts.
- **Tooling:** TypeScript, ESLint, Supabase CLI, tsx scripts.

## Repository Layout

```text
src/app/                 Next.js routes, route handlers, layouts, and dashboards
src/components/          Feature and shared UI components
src/lib/actions/         Server actions for mutations and workflows
src/lib/auth/            Auth context, permissions, route guards, and role helpers
src/lib/queries/         Server-side query modules
src/lib/supabase/        Supabase browser, server, admin, and proxy clients
src/lib/validation/      Zod schemas for forms and server actions
src/lib/db/types.ts      Generated Supabase database types
src/proxy.ts             Next.js proxy used to refresh Supabase sessions
scripts/                 Operational scripts
supabase/migrations/     Database schema, policies, RPCs, and hardening migrations
supabase/config.toml     Local Supabase project configuration
```

## Main App Areas

| Area | Routes | Purpose |
| --- | --- | --- |
| Authentication | `/auth/login`, `/auth/callback`, `/auth/accept-invite`, `/auth/forgot-password`, `/auth/reset-password` | Supabase login, invite acceptance, password reset, and session callback handling. |
| Dashboards | `/dashboard`, `/dashboard/reception`, `/dashboard/security`, `/dashboard/camp-manager`, `/dashboard/executive` | Role-specific operational summaries. |
| Room Board | `/room-board` | Camp room status, availability, occupancy, and filtering. |
| Guests | `/guests`, `/guests/new`, `/guests/[guestId]` | Guest registry and profile management. |
| Reception | `/reception/security-handoffs`, `/reception/expected-arrivals` | Security-to-reception handoffs and expected arrival management. |
| Reservations | `/reservations`, `/reservations/new`, `/reservations/[reservationId]` | Reservation lifecycle and conversion into stays. |
| Allocations | `/allocations`, `/allocations/new`, `/allocations/[allocationId]` | Room allocation before check-in. |
| Stays | `/stays`, `/stays/[stayId]` | Current and historical stay records, check-in, check-out, and absence creation. |
| Field Absences | `/field-absences`, `/field-absences/[fieldAbsenceId]` | Temporary guest departures and returns. |
| Security | `/security`, `/security/gate`, `/security/pending-reception`, `/security/guests/new` | Gate operations, guest intake, clearance review, and pending reception queue. |
| Guest Documents | `/guest-documents/review`, `/guest-documents/[documentId]` | Document review and secure download. |
| Imports | `/imports`, `/imports/new`, `/imports/[batchId]` | CSV upload, validation, batch review, and apply workflow. |
| Reports | `/reports`, `/reports/exports` | Operational reports and export downloads. |
| Admin | `/admin`, `/admin/users`, `/admin/camps`, `/admin/buildings`, `/admin/rooms`, `/admin/room-types`, `/admin/amenities`, `/admin/audit-logs` | System setup, users, access, inventory, and audit review. |
| Notifications | `/notifications`, `/notifications/new`, `/notifications/[notificationId]` | Internal alert and notification workflow. |

## Roles and Access Model

The app uses Supabase Auth for identity and application roles for authorization. Current user context is loaded through the `get_current_user_context_snapshot` RPC and represented by `CurrentUserContext`.

System roles:

- `super_admin`: global system actor with all permissions.
- `system_admin`: global administrative actor.

Camp-scoped roles:

- `camp_manager`: operational oversight, room board, arrivals, absences, and controlled import/export access.
- `receptionist`: expected arrivals, reservations, allocations, check-in/check-out, and security handoffs.
- `security`: gate dashboard, security review, visitor registration, and pending reception.
- `executive_viewer`: read-oriented dashboard/reporting access.

Camp-scoped roles require records in `user_camp_access`. Access levels are `viewer`, `operator`, `supervisor`, `manager`, and `admin`.

Protected routes under `src/app/(app)` must call one of:

- `requireAuth`
- `requirePermission`
- `requireAnyPermission`
- `requireRole`

Run the route audit before shipping route changes:

```bash
npm run audit:routes
```

## Database and Storage

Supabase is the system of record. The schema includes camps, buildings, rooms, amenities, guests, guest documents, reservations, expected arrivals, room allocations, stays, field absences, security clearance events, notifications, import batches, export jobs, audit logs, profiles, roles, permissions, and camp access.

Important implementation details:

- Database types live in `src/lib/db/types.ts`.
- Migrations live in `supabase/migrations`.
- Workflow-sensitive mutations are routed through SQL RPC functions where possible.
- Supabase Storage buckets are used for imports, exports, and guest documents.
- Local Supabase defaults are defined in `supabase/config.toml`:
  - API: `http://127.0.0.1:54321`
  - Database: `54322`
  - Studio: `54323`
  - Inbucket email UI: `54324`

## Environment Variables

Create `.env.local` for local development. Do not commit real secrets.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_FULL_NAME=
BOOTSTRAP_ADMIN_PHONE=

AUTH_DEBUG_TIMING=false
DASHBOARD_DEBUG_TIMING=false
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are required by browser and server Supabase clients.
- `SUPABASE_SERVICE_ROLE_KEY` is required for admin-only server operations and bootstrap scripts.
- `NEXT_PUBLIC_APP_URL` is used for auth redirects.
- `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or `VERCEL_URL` may be used when building invite links.
- Debug timing flags can be enabled during local troubleshooting.

## Local Development

Install dependencies:

```bash
npm install
```

Start Supabase locally, if using the local stack:

```bash
npx supabase start
```

Apply/reset the local database from migrations:

```bash
npx supabase db reset
```

Start the Next.js development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The root route renders the login page.

## Bootstrap a Super Admin

After the database has roles and at least one active camp, prepare the first super admin invite:

```bash
npx tsx scripts/bootstrap-super-admin.ts
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_FULL_NAME`

Optional:

- `BOOTSTRAP_ADMIN_PHONE`
- `NEXT_PUBLIC_APP_URL`

The script:

- invites or finds the Supabase Auth user,
- upserts the profile,
- assigns the `super_admin` role,
- grants admin access to active camps,
- writes an audit log entry.

For local Supabase, invitation emails are visible in Inbucket at `http://127.0.0.1:54324`.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run audit:routes
```

Additional scripts:

```bash
npx tsx scripts/bootstrap-super-admin.ts
npx tsx scripts/test-supabase-rest.ts
```

## Import Workflow

Imports are created from `/imports/new`.

Supported import types:

- `rooms_csv`
- `guests_csv`

The server action uploads the CSV to the `imports` bucket, creates a data import batch, parses up to 5,000 rows, validates headers and rows, stores row validation results, and marks the batch completed or failed.

Permissions involved:

- `data.import`
- `imports.rooms`
- `imports.guests`

## Export Workflow

Report exports are created from `/reports/exports`.

The server action creates an export job, builds the report file, uploads it to the `exports` bucket, marks the job complete, and redirects to the secure download route.

Permissions involved:

- `data.export`
- `exports.reports`
- `reports.export_csv`
- `reports.export_excel`
- `reports.export_pdf`

## Security Notes

- App pages are protected at the route level and hidden from navigation unless the current user has matching permissions.
- Unauthorized app access uses `notFound()` for permission failures.
- Session refresh is handled in `src/proxy.ts` through the Supabase proxy client.
- Supabase service-role access must stay server-only.
- Internal pages are marked `noindex` and `nofollow` in root metadata.
- Audit logs are written for sensitive workflows such as bootstrap and database-backed operational actions.

## Development Guidelines

- Read `AGENTS.md` before changing Next.js code. This project uses a Next.js version with changed conventions; relevant docs are under `node_modules/next/dist/docs/`.
- Prefer existing server actions, query modules, validation schemas, and shared UI components.
- Keep workflow authorization in server code, not only in client navigation.
- When adding app routes under `src/app/(app)`, run `npm run audit:routes`.
- Keep generated database types aligned with Supabase schema changes.

