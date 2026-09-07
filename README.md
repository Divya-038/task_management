# TaskFlow — Task Management Application

TaskFlow is a full-stack task management workspace built for an internship-level project submission. It combines authenticated access, persistent task CRUD, a Kanban board, dynamic dashboard statistics, realtime task events, responsive layouts, dark mode, profile management, and protected admin views in one cohesive product.

> The project is implemented on the supported WebDev full-stack runtime. It uses the platform's secure OAuth session and Drizzle/MySQL database integration rather than a separate MongoDB/JWT authentication service. This keeps secrets server-side, makes the project deployable in the managed environment, and preserves the requested product behaviors.

## Features

| Area | Implementation |
| --- | --- |
| Authentication | Secure platform OAuth session, persistent login, logout, protected tRPC procedures, and unauthorized handling |
| Authorization | User-owned task access plus `adminProcedure` protection for workspace-wide data |
| Task CRUD | Create, read, update, delete, status changes, task details, due dates, categories, priorities, and assignee references |
| Board | Three-column Kanban board for To do, In progress, and Completed |
| Search and filtering | Search title, description, and category; filter status, priority, and category; sort newest, oldest, due date, or priority |
| Dynamic dashboard | Total, pending, in-progress, completed, overdue, and high-priority task counts from the database |
| Realtime | Authenticated Socket.IO rooms and `task:created`, `task:updated`, `task:deleted`, and `task:statusChanged` broadcasts |
| Responsive UI | Desktop sidebar, mobile drawer navigation, adaptive filters, responsive board columns, and mobile-friendly task forms |
| Experience | Light/dark mode, loading skeletons, empty states, toast feedback, confirmation dialogs, and subtle Framer Motion transitions |
| Admin console | Protected overview statistics, user directory, all-task directory, and task removal controls |
| Profile | Display-name updates and role/account metadata |

## Technology

- React 19, Vite, TypeScript, Tailwind CSS, Wouter, Framer Motion, Lucide React, Sonner
- Express 4, tRPC 11, Drizzle ORM, MySQL/TiDB, Socket.IO
- Manus platform OAuth session, server-side environment configuration, and managed preview/deployment runtime

## Architecture

The application is a single managed Node.js process that serves the Vite client in development and the bundled client in production. The same HTTP server also owns the Socket.IO endpoint. tRPC provides the typed API boundary between the React UI and the Express server.

```text
React + Vite + Tailwind
        │
        ├── tRPC client ───────────────┐
        └── Socket.IO client            │
                                        ▼
                         Express + tRPC + Socket.IO
                                        │
                         Drizzle ORM + MySQL/TiDB
                                        │
                                   users / tasks
```

The backend is split into database helpers, protected router procedures, authentication infrastructure, and realtime event delivery. Task reads are scoped to the current user for regular members. Admin procedures intentionally omit the owner filter and are guarded by role middleware.

## Repository Structure

```text
client/
  src/
    components/          Reusable UI and platform components
    contexts/            Theme state
    pages/
      TaskManager.tsx    Main authenticated workspace, board, modals, admin views
      NotFound.tsx       Fallback route
    _core/hooks/         Platform auth hook
    App.tsx              Theme, toaster, and route shell
    index.css            TaskFlow design system
    main.tsx             tRPC client and React providers

drizzle/
  schema.ts              users and tasks tables, enums, indexes, foreign keys
  migrations/            Generated migration metadata
  0001_*.sql             Applied task schema migration

server/
  _core/                 Platform auth, tRPC, OAuth, storage, and Vite infrastructure
  db.ts                  Task/profile/statistics query helpers
  realtime.ts            Authenticated Socket.IO rooms and event broadcasts
  routers.ts             Protected task, dashboard, profile, and admin procedures
  *.test.ts              Vitest coverage

README.md
package.json
```

## Local Development

The WebDev runtime supplies the database and authentication environment variables. In a configured WebDev project, start the project with:

```bash
pnpm install
pnpm dev
```

Useful scripts are:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the managed development server with Vite and Express |
| `pnpm check` | Run the TypeScript compiler without emitting files |
| `pnpm test` | Run all Vitest tests |
| `pnpm build` | Build the client and bundle the production server |
| `pnpm db:push` | Generate and apply Drizzle migrations when schema changes are made locally |

## Database

The schema contains two core tables. `users` is the platform-authenticated member table. `tasks.userId` is the task owner foreign key with cascade deletion. `tasks.assignedUserId` is an optional assignee reference with `set null` deletion behavior.

Task values are validated at the API boundary. Priority values are `low`, `medium`, `high`, and `urgent`. Status values are `todo`, `in_progress`, and `completed`. A task is considered overdue when its due date is earlier than the current time and its status is not `completed`.

The migration creates indexes for owner, status, and due-date queries. It also adds the optional `avatar` field to `users` for future profile-image support.

## Representative Seed Data

The optional `pnpm seed` command inserts representative study, project, personal, high-priority, completed, and overdue tasks for the configured workspace owner. It is intentionally not run against the shared project database during development. Because this runtime uses OAuth instead of password accounts, the seed command does not create or store demo passwords.

## API Surface

The application uses tRPC procedures under `/api/trpc` rather than manually duplicated REST route handlers.

| Procedure | Access | Purpose |
| --- | --- | --- |
| `auth.me` | Public | Read the current authenticated user |
| `auth.logout` | Public | Clear the current session cookie |
| `tasks.list` | User | Search, filter, sort, and list owned tasks |
| `tasks.get` | User | Read one owned task |
| `tasks.create` | User | Create a validated task |
| `tasks.update` | User/Admin | Update an owned task or an admin-visible task |
| `tasks.delete` | User/Admin | Delete an owned task or an admin-visible task |
| `dashboard.stats` | User | Return dynamic dashboard counts for the current user |
| `profile.me` | User | Read profile metadata |
| `profile.update` | User | Update display name and optional avatar URL |
| `admin.stats` | Admin | Return workspace-wide counts |
| `admin.users` | Admin | Read the user directory |
| `admin.tasks` | Admin | Read all workspace tasks |
| `admin.deleteTask` | Admin | Remove an inappropriate task |
| `admin.promoteUser` | Admin | Change a user's role |

## Realtime Events

Socket.IO is mounted at `/socket.io`. Each authenticated connection joins a private `user:{id}` room. Administrators also join the `admins` room. Server-side task mutations emit events only after the database mutation succeeds.

| Event | Payload | Consumers |
| --- | --- | --- |
| `task:created` | Created task | Task owner and admins |
| `task:updated` | Updated task | Task owner and admins |
| `task:deleted` | `{ id, userId }` | Task owner and admins |
| `task:statusChanged` | Updated task | Task owner and admins |

The client listens for these events and invalidates the relevant tRPC caches. This allows connected views to update without a manual browser refresh while retaining database truth as the source of record.

## Authentication and Roles

A user is authenticated through the platform OAuth flow exposed by the scaffold. The application reads the current user through `useAuth()` and does not handle raw session cookies in React. Backend authorization is enforced in tRPC middleware, where `protectedProcedure` requires a user and `adminProcedure` additionally requires the `admin` role.

The current signed-in account may be promoted to admin through the platform's user data or the protected `admin.promoteUser` procedure. The UI conditionally exposes the admin navigation, but the server procedure remains the authoritative permission boundary.

## Testing

The repository includes Vitest tests for session logout behavior and task authorization/input validation. The final verification run completed successfully:

```text
Test Files  2 passed (2)
Tests       3 passed (3)
```

The production build also completed successfully with Vite and esbuild. The bundler reports a non-blocking chunk-size warning because the UI includes the complete icon and component set in one initial bundle.

## Deployment

The supported deployment shape is:

```text
React/Vite client
       │
       ▼
Managed Node.js + Express runtime
       │
       ├── tRPC API
       ├── Socket.IO endpoint
       └── Drizzle ORM
                │
                ▼
           MySQL/TiDB database
```

Use the WebDev checkpoint and publish workflow for deployment. Configure platform-provided database, OAuth, and cookie-secret variables through the project environment manager. Do not commit `.env` files, database credentials, OAuth secrets, or session secrets.

For a separate production hosting arrangement, deploy the bundled Node server to a WebSocket-capable Node host and provision a MySQL-compatible database. The client must point to the same origin or a configured API origin, and the Socket.IO endpoint must allow credentials from the client origin.

## Troubleshooting

If the app shows the sign-in state, launch the platform OAuth flow and return to the preview. If tasks do not load after a schema change, confirm that the migration has been generated and applied, then restart the development server. If realtime updates do not appear, confirm that the browser is connected to `/socket.io` and that both clients are authenticated into the same workspace. If an admin route returns forbidden, verify that the authenticated `users.role` value is `admin`.

## References

[1]: https://react.dev/ "React documentation"
[2]: https://trpc.io/docs "tRPC documentation"
[3]: https://orm.drizzle.team/docs/overview "Drizzle ORM documentation"
[4]: https://socket.io/docs/v4/ "Socket.IO documentation"
[5]: https://tailwindcss.com/docs "Tailwind CSS documentation"
#   t a s k _ m a n a g e m e n t  
 