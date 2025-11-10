## BetaSeries → Trakt migrator

A Vite + React + TypeScript web application that replicates the behaviour of the
[tuxity/betaseries-to-trakt](https://github.com/tuxity/betaseries-to-trakt) CLI.
It guides you through authenticating with the BetaSeries and Trakt APIs and
migrates your tracked shows and movies directly from the browser.

The implementation follows the official API references:

- [BetaSeries REST API](https://developers.betaseries.com/)
- [Trakt API · Device OAuth & Sync endpoints](https://trakt.docs.apiary.io/#)

### Prerequisites

- Node.js ≥ 20 (LTS recommended)
- npm 10+
- Personal credentials for both services:
  1. **BetaSeries** – create a personal application at
     <https://www.betaseries.com/compte/api> and copy the API key (optionally a
     member token if you need authenticated routes in the future).
  2. **Trakt** – register a personal OAuth app at
     <https://trakt.tv/oauth/applications/new>. Grab the client id and secret.

### BetaSeries data exports

1. Navigate to <https://www.betaseries.com/compte/avance>.
2. Download the `series-*.csv` and `films-*.csv` exports.
3. Keep the files untouched; the app reuses the original Python script parsing
   logic.

### Development setup

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` and follow the on-screen steps:

1. Paste your BetaSeries API key.
2. Drop both CSV exports – the UI will display how many entries will end up in
   the Trakt watchlist vs history buckets.
3. Enter your Trakt client id + secret, request the device code, and approve
   the application on trakt.tv.
4. Review the summary and launch the migration.

The Vite dev server ships with a local proxy that mirrors the serverless routes
under `/api/*`, so no extra tooling is required while iterating. The proxy keeps
the client secret away from the browser-to-Trakt request chain and returns the
permissive CORS headers the SPA expects.

The app mirrors the original mapping rules:

- **Shows** with `status === 0` go to the Trakt watchlist, otherwise to history
  (partial progress is expanded into season/episode payloads using the last
  watched episode code).
- **Movies** with status `0` are watchlist items, `1` are marked as watched, and
  `2` are ignored.

### Quality checks

```bash
npm run lint   # static analysis
npm run build  # type-check + production bundle
```

### Notes & limitations

- Trakt&apos;s device flow requires your client secret. The UI only sends it to the
  backend proxies at `/api/trakt-*`, which forward the request to Trakt from the
  server (Vercel in production, Node inside Vite during development).
- The app serially resolves show/movie identifiers via the BetaSeries API; large
  libraries may take a little time because of rate limits.
- The response panel lists any items the APIs could not resolve so you can fix
  them manually.

### Deploying on Vercel

- The `api/` directory contains three Node serverless functions:
  - `trakt-device-code` – requests device codes from Trakt without CORS issues
  - `trakt-device-token` – exchanges device codes for access/refresh tokens
  - `trakt-sync` – posts history/watchlist payloads to Trakt
- Deploy with `vercel` (or push to a Vercel-connected repository). Configure any
  desired environment variables in the dashboard; the UI accepts client id and
  secret at runtime, so no secrets must be baked into the build.
- Optional: run `vercel dev` for full parity, although the bundled Vite proxy
  already mimics the production endpoints locally.

### Project structure

- `src/components/` – UI steps for credentials, uploads, device auth, and
  migration results.
- `src/lib/` – API clients, CSV parsing, and migration orchestration utilities.

Feel free to adapt the flow for additional filters (for instance, excluding
archived shows) or to wire in a backend if you need to keep secrets off the
client.
