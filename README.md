# Secure File Sharing & Cloud Storage — Frontend

Frontend for the **Secure File Sharing & Cloud Storage Web Application** (COP 4521).
A Dropbox/Google-Drive-style client: accounts, file upload/download, folders,
sharing with permission levels, role-based access control, and an audit trail.

> **Ben Ashir Georges — Frontend Development & User Interface.** This app is
> wired directly to Samuel's Django REST backend (`secure-file-share-backend`).

## Tech stack

| Concern | Choice |
| :--- | :--- |
| Framework | React 19 + TypeScript (strict) |
| Build tool | Vite 6 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| HTTP | Axios |

## Getting started

Both servers need to be running.

**1 — Backend** (in the `secure-file-share-backend` repo):

```bash
python manage.py migrate      # seeds the four roles automatically
python manage.py runserver    # http://127.0.0.1:8000
```

**2 — Frontend** (this repo):

```bash
npm install
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173 and register an account. The login screen pings
`/api/health/` and warns you up front if the backend is not reachable.

New accounts get the **Write Only** role, which can upload, download, and share
its own files. To try the admin console, promote a user with:

```bash
python manage.py shell -c "
from accounts.models import User, Role
u = User.objects.get(username='YOUR_USERNAME')
u.role = Role.objects.get(name='admin'); u.save()"
```

## Scripts

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check without emitting files |

## Backend connection

`VITE_API_BASE_URL` defaults to `/api`, which `vite.config.ts` proxies to
`http://localhost:8000`. Because the browser only ever talks to its own origin
in development, **CORS never comes into play** — there is no need to add port
5173 to the backend's `CORS_ALLOWED_ORIGINS` while developing locally.

For a deployed build, point it at the real API root instead:

```env
VITE_API_BASE_URL=https://your-app.railway.app/api
```

and add the frontend's origin to `CORS_ALLOWED_ORIGINS` on the backend.

### Endpoints consumed

Every backend route ends in a **trailing slash** — Django will not match without
it, and `APPEND_SLASH` cannot redirect a POST/PATCH/DELETE.

| Method | Path | Used by |
| :--- | :--- | :--- |
| GET | `/api/health/` | Login screen connection check |
| POST | `/api/accounts/register/` | `api/auth.ts` |
| POST | `/api/accounts/login/` | `api/auth.ts` |
| POST | `/api/accounts/token/refresh/` | `api/client.ts` interceptor |
| GET | `/api/accounts/me/` | Session restore |
| GET | `/api/accounts/users/` | Admin console (admin only) |
| PATCH | `/api/accounts/users/<id>/role/` | Admin role dropdown |
| GET | `/api/storage/files/` | Files page, Dashboard |
| POST | `/api/storage/files/upload/` | Upload modal (multipart) |
| GET | `/api/storage/files/<id>/download/` | File card |
| DELETE | `/api/storage/files/<id>/delete/` | File card |
| GET / POST | `/api/storage/folders/` | Files page |
| DELETE | `/api/storage/folders/<id>/delete/` | Folder card |
| GET / POST | `/api/storage/files/<id>/permissions/` | Share modal |
| DELETE | `/api/storage/files/<id>/permissions/<user_id>/` | Share modal |
| GET | `/api/activity/logs/me/` | Activity page, Dashboard |
| GET | `/api/activity/logs/` | Admin console (admin only) |

### Authentication

Login returns a JWT **pair**, not a user object, so `api/auth.ts` stores the
tokens and then fetches `/accounts/me/` to build the session.

simplejwt is running on its defaults, which means the **access token expires
after five minutes** while the refresh token lasts a day. `api/client.ts`
handles this transparently: on a 401 it exchanges the refresh token for a new
access token and replays the original request. Concurrent 401s share a single
in-flight refresh so parallel requests cannot invalidate each other, and each
request is retried only once. If the refresh itself fails, the session is
cleared and React routes back to `/login`.

## Role-based access control

Client-side checks mirror the backend's `User` model properties so the UI never
offers an action the API would reject. They are a UX nicety — **every endpoint
re-checks server-side.**

| Role | Upload | Download | Share own files | Assign roles | Admin console |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `read_only` | — | Yes | Yes | — | — |
| `write_only` | Yes | Yes | Yes | — | — |
| `group_leader` | Yes | Yes | Yes | Yes | — |
| `admin` | — ¹ | Yes | Yes (any file) | Yes | Yes |

¹ Not a typo: the backend's `User.can_upload` admits only `group_leader` and
`write_only`, so a system admin cannot upload. `useAuth().canUpload` matches
that exactly and hides the upload button. If admins should be able to upload,
add `Role.ADMIN` to that tuple in `accounts/models.py`.

## Project structure

```
src/
├── api/                # The only layer that touches axios
│   ├── client.ts       #   instance, JWT storage, refresh interceptor, health
│   ├── auth.ts         #   register / login / me / users / role updates
│   ├── files.ts        #   list / upload / download / delete
│   ├── folders.ts      #   list / create / delete
│   ├── permissions.ts  #   share / list / revoke (+ username→id resolution)
│   └── activity.ts     #   my logs / all logs
├── components/         # Presentational UI (cards, modals, tables, badges)
├── context/            # AuthContext — session state + role helpers
├── routes/             # ProtectedRoute (auth + role gating)
├── pages/              # Login, Register, Dashboard, Files, Activity, Admin
├── types/              # TS mirrors of the DRF serializers
├── lib/                # cn, formatBytes, formatDate, getErrorMessage
├── App.tsx             # Route table
├── main.tsx            # Entry (Router + AuthProvider)
└── index.css           # Tailwind + shared component classes
```

### Architecture notes

- **Data flows down, actions flow up.** Pages call the `api/` layer; components
  stay presentational and receive data via props.
- Types in `src/types/` mirror the DRF serializers field-for-field, snake_case
  included, so there is no translation layer to drift out of sync.
- `getErrorMessage` in `lib/utils.ts` flattens all three DRF error shapes
  (`{detail}`, field errors, `non_field_errors`) into one readable string.
- Import with the `@/` alias, e.g. `import { useAuth } from '@/context/AuthContext'`.

## Known backend gaps

Two things the frontend works around rather than papers over:

1. **Revoking a share needs a user id the API never returns.**
   `FilePermissionSerializer` renders `user` with a `StringRelatedField`, so a
   permission record carries a *username*, while
   `DELETE .../permissions/<user_id>/` is keyed by the numeric id. The only
   username→id map is `GET /accounts/users/`, which is admin-only, so **revoke
   works for admins and is disabled with an explanation for everyone else.**

   One-line backend fix, after which `resolveUserId` in `api/permissions.ts`
   can be deleted:

   ```python
   class FilePermissionSerializer(serializers.ModelSerializer):
       user_id = serializers.IntegerField(source='user.id', read_only=True)   # add
       ...
       fields = ['id', 'file', 'user', 'user_id', 'permission_level',         # add user_id
                 'granted_by', 'granted_at']
   ```

2. **`GET /storage/files/` has no folder filter.** It returns every accessible
   file in one flat list, so folder navigation is done client-side. A file
   shared with you keeps its *owner's* `folder` id, which is not in your own
   folder list — the Files page maps any such file to your root so it stays
   reachable instead of being hidden in a folder you cannot open.

## Where to build next

- Nested-folder breadcrumbs already work; drag-and-drop between folders does not.
- A profile/settings page (change password is not exposed by the API yet).
- Pagination once the file and log lists grow — both endpoints return everything.
