# Deploy PastQ (Render + Vercel + Supabase)

## Order

1. Deploy **backend** on Render first → get URL  
2. Deploy **frontend** on Vercel with `VITE_API_URL` = Render URL  
3. Update **Supabase** Site URL + Redirect URLs to Vercel  
4. Set Render `FRONTEND_URL` to Vercel URL → redeploy backend if needed  

## Backend (Render)

Repo: https://github.com/emmanuel582/pastqbackend

Env:

```
NODE_VERSION=20
MISTRAL_API_KEY=...
SUPABASE_URL=https://ovrlwgslzqvdofgkfcxl.supabase.co
SUPABASE_ANON_KEY=...
FRONTEND_URL=https://YOUR-FRONTEND.vercel.app
```

## Frontend (Vercel)

Repo: https://github.com/emmanuel582/pastqfrontend

Env:

```
VITE_SUPABASE_URL=https://ovrlwgslzqvdofgkfcxl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_API_URL=https://YOUR-BACKEND.onrender.com
```

## Supabase checklist

Authentication → URL Configuration:

- Site URL = Vercel URL  
- Redirect URLs include `https://YOUR-FRONTEND.vercel.app/**` and `https://*.vercel.app/**`  

Google provider must stay enabled under Authentication → Providers.
