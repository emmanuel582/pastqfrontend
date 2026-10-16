# PastQ Frontend

The standalone React/Vite app for https://github.com/emmanuel582/pastqfrontend.

The app opens with Scholar's greeting and account actions. Create an account first, then choose Undergraduate or Other learner. Undergraduates pick a university; other learners can pick a school, pick an exam or explore. Saved choices are retained on the account. The initial appearance follows the device theme.

Reviewed uploads are saved before session customization. Opening a saved material returns to customization, and completing answer review returns to Browse.

## Run locally

Use Node.js 22.13 or newer.

```sh
npm ci
cp .env.example .env
# Fill in the Supabase project URL and public publishable/anon key.
# Leave VITE_API_URL empty to proxy /api to a local backend on port 3000.
npm run dev
```

## Verify

```sh
npm test
npm run build
npm audit --audit-level=high
```

Tests use public test placeholders for Supabase configuration; they do not create real accounts. Production needs the actual public Supabase settings and backend origin.

See [deployment instructions](DEPLOY.md) and [release checks](docs/production-readiness.md). The matching API is maintained in https://github.com/emmanuel582/pastqbackend.

Preferences now contains real progress, device theme settings and opt-in study reminders. See [reminder setup and device checks](docs/study-reminders.md) before enabling production delivery.

Discover is for public tutorials/exam sessions and private-code joins. Home uses downloaded papers and account-scoped offline outcomes; see [student spaces](docs/student-spaces.md) for behavior and the future teacher-app boundary.
