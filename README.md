# PastQ Frontend (Vercel)

## Deploy on Vercel

1. Go to [Vercel](https://vercel.com) → **Add New Project**
2. Import: `https://github.com/emmanuel582/pastqfrontend`
3. Framework preset: **Vite** (auto from `vercel.json`)
4. Environment variables:

| Key | Value |
|-----|--------|
| `VITE_SUPABASE_URL` | `https://ovrlwgslzqvdofgkfcxl.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your Supabase anon key |
| `VITE_API_URL` | your Render URL, e.g. `https://pastq-backend.onrender.com` (**no trailing slash**) |

5. Deploy → copy the Vercel URL

## Supabase Auth (required for Google / redirects)

In Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `https://YOUR-APP.vercel.app`
- **Redirect URLs** (add all):
  - `https://YOUR-APP.vercel.app/**`
  - `https://*.vercel.app/**`
  - `http://localhost:5173/**`

Then set Render `FRONTEND_URL` to the same Vercel URL.

## Local

```bash
npm install
cp .env.example .env
# leave VITE_API_URL empty so Vite proxies /api → localhost:3000
npm run dev
```
