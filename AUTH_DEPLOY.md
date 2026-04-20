# Auth Deployment Notes

## Target Setup

- Frontend static site on Vercel
- Auth/API service on Render
- SQLite stored on a Render persistent disk

## Backend Env Vars

- `NODE_ENV=production`
- `ODC_API_PORT=10000`
- `ODC_DB_PATH=/var/data/odc.sqlite`
- `FRONTEND_ORIGIN=https://odc-preview.vercel.app`

Optional:

- `API_ALLOWED_ORIGINS=https://www.odyssee.ma,https://another-frontend.example`

## Frontend Env Vars

- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`

## Important Notes

- Cross-origin auth cookies require `credentials: include` on the frontend and `SameSite=None; Secure` on the backend.
- The backend now switches to cross-origin cookie mode automatically when `FRONTEND_ORIGIN` is set.
- Render persistent disk is required if you keep SQLite.
- For multi-instance scaling or stricter resilience, migrate SQLite to Postgres later.
