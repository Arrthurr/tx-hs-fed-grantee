# Release and operations runbook

Production: <https://texasheadstartgrantees.online/> on Netlify.
Origin: [issue #16](https://github.com/Arrthurr/tx-hs-fed-grantee/issues/16).

## Exposure

The site is a **public directory with no authentication**. Treat everything
under `public/`, every browser bundle and every `VITE_*` value as public.
Hosting-level authentication is not required for the current public data and
must not be added without an agreed requirement. The Google Maps browser key is
necessarily visible to visitors; it is protected only by Google Cloud
referrer/API restrictions and quotas (owner actions below).

## Ownership

Proposed accountable owner for releases, data refreshes and incidents:
repository owner **Arrthurr**, pending confirmation (owner action 6). Git
repository ownership does not establish access to the Netlify site or the
Google Cloud project; that access must be confirmed separately.

## Build environment

- Node.js 22.12+ on the 22 major (`package.json` `engines`), CI on Node 22,
  `.nvmrc` 22.22.0, Netlify `NODE_VERSION` 22.22.0 (`netlify.toml`).
- Install from the lockfile with `npm ci`.
- Configure variables from `.env.example` as Netlify environment variables
  (`VITE_GOOGLE_MAPS_API_KEY`, optional `VITE_GOOGLE_MAPS_MAP_ID`). Vite embeds
  them at build time, so set them before building and redeploy after changes.
  Never commit real keys; `.env.local` is gitignored.
- Before release run `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:data`, `npm run test:advisories` and `npm run build` (CI runs
  these plus the Playwright SDK-double suite).

## Netlify configuration

`netlify.toml` builds with `npm run build` and publishes `dist`. Cache policy
(non-overlapping patterns):

| Path | Cache-Control |
| --- | --- |
| `/`, `/index.html`, `/data-provenance.md` | `public, max-age=0, must-revalidate` |
| `/assets/geojson/*`, `/assets/txhsa-geojson/*` | `public, max-age=0, must-revalidate` |
| `/assets/*.js`, `/assets/*.css` (content-hashed Vite bundles) | `public, max-age=31536000, immutable` |

Only hashed JS/CSS are immutable; data files keep stable names and must
revalidate. No Content-Security-Policy is configured: a policy compatible with
the Google Maps SDK has not been designed or tested. Account-level Netlify
security settings are outside the repository.

Localhost Vite headers (`vite.config.ts` `server.headers`) describe only the dev
server, not production.

### Observed production headers

Observed 2026-10-07 from an Amp orb. This records the deployment at that time;
it is **not** evidence that `netlify.toml` has deployed (it had not been
committed when observed).

`curl -sI https://texasheadstartgrantees.online/`

```text
HTTP/2 200
cache-control: public,max-age=0,must-revalidate
content-type: text/html; charset=UTF-8
server: Netlify
strict-transport-security: max-age=31536000
vary: Accept-Encoding
```

`curl -sI -H 'Accept-Encoding: br, gzip' https://texasheadstartgrantees.online/assets/txhsa-geojson/east.geojson`

```text
HTTP/2 200
cache-control: public,max-age=0,must-revalidate
content-encoding: br
content-type: application/geo+json
server: Netlify
strict-transport-security: max-age=31536000
vary: Accept-Encoding
```

`curl -sI https://texasheadstartgrantees.online/assets/index-Do4-Tb4u.js`

```text
HTTP/2 200
cache-control: public,max-age=0,must-revalidate
content-type: application/javascript; charset=UTF-8
server: Netlify
strict-transport-security: max-age=31536000
vary: Accept-Encoding
```

Findings: HTTPS over HTTP/2 with HSTS (no `includeSubDomains`/`preload`),
Netlify edge, HTML revalidates, GeoJSON served with Brotli on request. Hashed
JS was still `must-revalidate` (Netlify default), not immutable. After the
first deploy with `netlify.toml`, rerun the third command and expect
`public, max-age=31536000, immutable` (substitute the current hashed filename
from the page source).

## Source maps and error diagnosis

Production builds do not emit source maps, and none are uploaded to any
private service. Diagnose a production report from the deployed commit (shown
in the Netlify deploy) plus local reproduction with `npm run build` and
`npm run preview` or `npm run dev`. Deploys published before source maps were
disabled may still serve `.map` files until republished or superseded.

## Monitoring

There is no SaaS monitoring and no telemetry. Production console output is
stripped from builds. **There are no unattended application-error alerts**;
errors in visitors' browsers are not reported anywhere automatically.
Monitoring is manual:

- Release smoke after every production deploy (below).
- Weekly availability check: load <https://texasheadstartgrantees.online/>
  over HTTPS and confirm the map and markers render.
- Problems are reported through GitHub issues.

## Release smoke

After each deploy:

1. `curl -sI https://texasheadstartgrantees.online/` returns HTTP/2 200 from
   Netlify with HSTS.
2. In a browser, the page loads over HTTPS and the header, layer controls,
   search and data-provenance links render.
3. Search for a known location (for example `Tyler`), open its details, close
   them and confirm focus returns.
4. Toggle **TXHSA Regions**; four overlays and region buttons/details appear
   with counts West 14, North 23, East 28, South 20.
5. The browser console and page source contain no credentials beyond the
   intentionally public Maps browser key; do not paste key values, credential
   URLs or unredacted HAR files into issues or logs.
6. Live Google Maps key behavior (referrer rejection from other origins,
   quota/billing state) is checked by the owner in Google Cloud.

## Rollback

1. In Netlify **Deploys**, open the last known-good production deploy and
   choose **Publish deploy**. HTML and data revalidate, so the rollback is
   effective immediately; old hashed bundles remain referenced only by old HTML.
2. If the bad change must not be rebuilt, revert the commit on `main` and let
   Netlify rebuild, or trigger a deploy after the revert.
3. Run the release smoke against the restored deploy and record the incident
   in a GitHub issue.

## Data refresh

Follow the refresh procedure in
[`public/data-provenance.md`](../../public/data-provenance.md). In summary:
update the source inputs (never hand-edit generated region files), run
`npm run build:regions` and `npm run test:data`, then the full checks above,
review count/geometry differences and commit the source, metadata and
generated outputs together. Release through the normal deploy and smoke.

## Incidents

Open a GitHub issue in `Arrthurr/tx-hs-fed-grantee` describing the symptom,
time, deployed commit and browser. There is no pager or on-call rotation.
Rollback first when production is broken; then fix forward through a reviewed
change. If a Maps key is suspected of abuse, the owner rotates/restricts it in
Google Cloud, updates the Netlify variable and redeploys; never post the key.

## Owner actions

Repository work for #16 covers documentation, tooling and hosting headers.
The items below are **not satisfied** until the owner acts and records
evidence (without secrets). Tracked in
[issue #31](https://github.com/Arrthurr/tx-hs-fed-grantee/issues/31).

| # | Item | Status | Accountable owner | Required evidence / action | Review by |
| --- | --- | --- | --- | --- | --- |
| 1 | Authority and chosen license for original software | Blocked: no grant recorded (`UNLICENSED`) | Arrthurr (proposed) | Confirm rights holder(s) and chosen license; replace `LICENSE.md` and `package.json` `license` | 2027-01-05 |
| 2 | Redistribution permission for location snapshot, county source and generated boundaries | Blocked: terms unknown | Arrthurr (proposed) | Record terms/source for each dataset in `public/data-provenance.md`, or restrict publication | 2027-01-05 |
| 3 | Maps key HTTP-referrer and API restrictions | Unverified | Arrthurr (proposed) | Confirm referrers limited to production (and needed preview) origins and APIs limited to Maps JavaScript API; record a redacted confirmation, never the key | 2027-01-05 |
| 4 | Quotas, billing alerts, notification recipients, cost limits | Unverified | Arrthurr (proposed) | Record configured quotas, budget alert thresholds and recipients; note that budget alerts are notifications, not hard caps; set quota caps if spend must be bounded | 2027-01-05 |
| 5 | Netlify account/deploy permissions and notification config | Unverified | Arrthurr (proposed) | Confirm who can deploy/rollback, that the site builds from `main` with `netlify.toml`, and deploy-failure notification recipients | 2027-01-05 |
| 6 | Operational ownership and manual-monitoring limitation | Proposed | Arrthurr (proposed) | Confirm accountable owner and accept that there are no unattended error alerts (weekly manual check only) | 2027-01-05 |
