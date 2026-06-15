# Secure File Sharing & Cloud Storage — Frontend

Frontend for the **Secure File Sharing & Cloud Storage Web Application** (COP 4521).
A Dropbox/Google-Drive-style client: accounts, file upload/download, folders,
sharing with permissions, and role-based access control (RBAC).

> **Member 1 — Frontend Development & UI.** This app talks to Member 2's REST
> API, but ships with a **mock mode** so the entire UI runs without a backend.

## Tech stack

| Concern | Choice |
| :--- | :--- |
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| HTTP | Axios |

## Getting started

```bash
npm install      # already done once during setup
npm run dev      # start the dev server → http://localhost:5173
```

Open http://localhost:5173. The app starts in **mock mode**, so you can log in
immediately:

- **Admin:** `admin@demo.com` (any password) — sees the Admin page
- **Standard user:** `user@demo.com` (any password)

## Scripts

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check without emitting files |

## Connecting to the real backend

1. Make sure Member 2's API is running (default `http://localhost:8000`).
2. In `.env`, set:
   ```env
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=/api
   ```
   In dev, `/api` is proxied to `http://localhost:8000` (see `vite.config.ts`).
   For production, set `VITE_API_BASE_URL` to the full backend URL.
3. Restart `npm run dev`.

The expected API contract lives in `src/api/auth.ts` and `src/api/files.ts`
(every call has a real-axios branch alongside the mock branch). Coordinate
these endpoints with Member 2.

### Expected endpoints

| Method | Path | Purpose |
| :--- | :--- | :--- |
| POST | `/api/auth/register` | Create account → `{ user, token }` |
| POST | `/api/auth/login` | Log in → `{ user, token }` |
| GET | `/api/auth/me` | Current user (restore session) |
| GET | `/api/users` | List users (admin only) |
| GET | `/api/files?folderId=` | List files/folders |
| POST | `/api/files/upload` | Upload (multipart) |
| POST | `/api/files/folder` | Create folder |
| POST | `/api/files/:id/share` | Share with an email |
| GET | `/api/files/:id/download` | Download bytes |
| DELETE | `/api/files/:id` | Delete |

Auth uses a JWT bearer token stored in `localStorage` and attached to every
request (see `src/api/client.ts`).

## Project structure

```
src/
├── api/            # API layer (axios client + per-resource calls + mock backend)
│   ├── client.ts   #   axios instance, JWT interceptors, USE_MOCK flag
│   ├── auth.ts     #   login / register / me / users
│   ├── files.ts    #   list / upload / download / share / delete
│   └── mock.ts     #   in-memory fake backend for offline UI dev
├── components/     # Reusable UI (Navbar, FileCard, Modal, UploadModal, …)
├── context/        # AuthContext — auth state + RBAC (useAuth hook)
├── routes/         # ProtectedRoute (auth + role gating)
├── pages/          # Login, Register, Dashboard, Files, Admin, NotFound
├── types/          # Shared TypeScript types (User, FileItem, Role, …)
├── lib/            # Helpers (cn, formatBytes, formatDate)
├── App.tsx         # Route table
├── main.tsx        # App entry (Router + AuthProvider)
└── index.css       # Tailwind + shared component classes
```

### Architecture notes

- **Data flows down, actions flow up.** Pages call the `api/` layer; the API
  layer is the only place that touches axios. UI components stay presentational.
- **RBAC** is enforced two ways: `ProtectedRoute role="ADMIN"` gates routes,
  and `useAuth().hasRole(...)` gates UI (e.g. the Admin nav link).
- Import with the `@/` alias, e.g. `import { useAuth } from '@/context/AuthContext'`.

## Where to build next

- Folder navigation (the file list already filters by `folderId`).
- Per-file permission levels (view vs. edit) in the share modal.
- Activity log / audit trail page.
- Profile & settings page.
