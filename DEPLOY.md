# Deploy the standalone frontend

Repository: https://github.com/emmanuel582/pastqfrontend, branch `main`.

Use Node.js 22.13 or newer, install with `npm ci`, build with `npm run build`, and serve `dist`. Route application paths to `index.html`. The Vercel configuration includes that rewrite and security headers.

Set these public build-time variables in the hosting project:

- `VITE_SUPABASE_URL`: the actual Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the browser-safe publishable/anon key.
- `VITE_API_URL`: the HTTPS backend origin, without `/api`.

Never set a service-role key in a `VITE_` variable. `.env.example` and CI placeholders are examples, not production credentials. Rebuild after changing build-time variables.

Deploy the matching backend from https://github.com/emmanuel582/pastqbackend first. It needs Supabase configuration, a stable `SESSION_OWNER_HMAC_SECRET`, a persistent writable `DATA_DIR`, and the actual frontend origin in `FRONTEND_URL`. Keep the ownership secret stable across releases so existing uploads remain accessible.

In Supabase, configure the actual frontend Site URL, OAuth/password recovery redirects, and existing student RLS policies. New accounts and older accounts without a saved study choice should open short onboarding after authentication. Completed choices should open the study room.

GitHub CI checks tests, builds and dependency audits. Hosting must follow `main` and rebuild the latest commit. Verify live account, upload/save and exam flows after deployment; see [release checks](docs/production-readiness.md).
