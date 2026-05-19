---
id: DEC-06
title: Cloudflare Worker outpost — serve skyline-scroller.fidom.link with edge-cached versioning and PR-preview routing
type: decision
status: proposed
date: 2026-05-20
supersedes: []
superseded-by: []
tags: [cloudflare, workers, wrangler, deploy, dns, edge, ci, pr-preview, hosting, fidom-link]
related:
  - "[[operations/build-deploy]]"
  - "[[decisions/DEC-05-low-code-config]]"
  - "[[entities/Deploy Workflow]]"
  - "[[entities/PR Preview Workflow]]"
---

# DEC-06 — Cloudflare Worker outpost for `skyline-scroller.fidom.link`

> [!warning] SUPERSEDED 2026-05-20 by [[decisions/DEC-09-homelab-deploy]]
> This ADR was drafted on the wrong assumption that the user deploys via Cloudflare Workers. A 7-agent recon swarm established that the actual target is a self-hosted homelab (Traefik + Authentik embedded outpost on Deployarr 192.168.0.110). **Use DEC-09 for the real deployment path.** This page is retained as a historical record of the rejected alternative.

## Problem

The site currently deploys exclusively to GitHub Pages. The production artefact lives under `https://<owner>.github.io/skyline-scroller/`, and PR previews under `https://<owner>.github.io/skyline-scroller/pr-preview/pr-N/`. This works, but the canonical host the user wants for sharing the project is **`skyline-scroller.fidom.link`** — a subdomain of their personal Cloudflare-managed zone `fidom.link` (account `fszalaj@fidom.link`).

Three concrete shortcomings of the Pages-only setup:

1. **URL shape.** `github.io/skyline-scroller/` leaks the repo path into every absolute URL (`base=/skyline-scroller/` is wired into three workflow YAMLs — see `.github/workflows/{ci,deploy,pr-preview}.yml:35`). Moving to a dedicated subdomain lets `base=/` everywhere; the codebase stops having to know the path it is hosted under.
2. **No edge versioning control.** GitHub Pages serves with its own `Cache-Control: max-age=600` for HTML and longer for assets, with no way to tune. We want **immutable** caching for content-hashed assets (`assets/index-abc123.js`) and **short** caching for `index.html` so the SPA shell updates promptly on each deploy.
3. **PR-preview path ergonomics.** Today: `…/skyline-scroller/pr-preview/pr-42/`. Wanted: `…/pr/42/` on the same canonical host — shorter, no leakage of the action's naming convention, and routable through one Worker.

Existing constraints from [[operations/build-deploy]] are unchanged: zero runtime dependencies in the SPA bundle (see `package.json` — no `dependencies` block), Node 22 across all CI jobs, trunk-based on `main`. [[decisions/DEC-05-low-code-config]] introduces `vite.config.ts` with `base: process.env.PUBLIC_BASE_PATH ?? '/'`; this decision **assumes DEC-05 has landed**, so the build command is plain `npm run build` with `PUBLIC_BASE_PATH=/` (or unset) — no `--base=/skyline-scroller/` flag is passed for the Cloudflare deploy.

## Constraints

- **Workers Free tier only.** No paid product. 100 000 requests/day, 10 ms CPU per request — both well above what a static-SPA outpost consumes. No Workers Paid, no Pages (the user already has Pages; we're not switching to Cloudflare Pages — explicit choice, see decision §1).
- **Pure static SPA hosting.** No SSR, no edge logic beyond cache-header rewrites and SPA fallback. The Worker is a thin router.
- **Preserve PR-preview ergonomics.** Each PR must still get a unique, shareable URL that auto-updates on push and tears down on close.
- **Deterministic versioning.** Content-hashed asset filenames (`assets/index-[hash].js` — Vite default) get `Cache-Control: public, max-age=31536000, immutable`. `index.html` gets `Cache-Control: public, max-age=60, must-revalidate`. ETag and Last-Modified come from the assets binding for free.
- **No new SPA runtime dep.** The Worker is its own package under `worker/` with its own `package.json`; the root `package.json` stays unchanged.
- **Coexistence.** GitHub Pages deploy stays alive for ~2 weeks as fallback. The Worker route does not block Pages.
- **Manual auth setup is acceptable.** Cloudflare API token issuance and GitHub Secrets are one-time human steps. We document them; we don't try to automate token creation.

## Decision

Introduce a Cloudflare Worker named **`skyline-scroller-outpost`** deployed via Wrangler, fronting `skyline-scroller.fidom.link` with a static-assets binding pointing at the Vite `dist/` build. A new GitHub Actions workflow `deploy-worker.yml` builds the SPA and ships it through `cloudflare/wrangler-action@v3` on every push to `main`. PR previews are uploaded to a parallel `dist-pr/` directory and routed via `/pr/:n/*`. The existing `deploy.yml` (GitHub Pages) stays in place as a fallback.

### 1. Why a Worker, not Cloudflare Pages

Cloudflare Pages would also do static hosting and PR previews, but:

- Pages is a separate product with its own GitHub App OAuth handshake; the user has explicitly framed this as a Worker outpost, and Workers compose better with the rest of their `fidom.link` zone.
- Worker assets binding (`assets.directory` in `wrangler.toml`, GA in Wrangler 3.78+, see [Cloudflare docs — Workers Assets](https://developers.cloudflare.com/workers/static-assets/)) provides exactly the static-file serving primitive we need, with first-class control over cache headers and routing rules.
- One Worker can multiplex `/` (prod) and `/pr/:n/*` (previews) under one route pattern — Pages requires a separate "preview deployment" per branch, which doesn't map cleanly to a PR number.

### 2. Repository layout

New files under `worker/`:

```
worker/
├── wrangler.toml           # Worker config — name, route, assets binding
├── package.json            # devDeps: wrangler, @cloudflare/workers-types
├── tsconfig.json           # Worker-scoped TS config
└── src/
    └── index.ts            # ~60 LOC Worker source
```

`worker/` is a sibling to `src/` (the SPA). The root `package.json` is untouched; the Worker has its own dependency closure to keep concerns separate.

### 3. `worker/wrangler.toml`

```toml
# worker/wrangler.toml
# Cloudflare Worker config for skyline-scroller-outpost.
# Deployed by .github/workflows/deploy-worker.yml on push: main.
#
# Required GitHub secrets:
#   CF_API_TOKEN  — token with Account.Workers Scripts:Edit, Zone.DNS:Read
#   CF_ACCOUNT_ID — Cloudflare account id (32-char hex)

name = "skyline-scroller-outpost"
main = "src/index.ts"
compatibility_date = "2026-05-20"
compatibility_flags = ["nodejs_compat"]   # not used today; cheap forward-compat
account_id = "${CF_ACCOUNT_ID}"           # injected by wrangler-action from secret

# Production route — proxied subdomain of fidom.link.
# The route pattern includes the wildcard; the Worker handles all paths.
[[routes]]
pattern = "skyline-scroller.fidom.link/*"
zone_name = "fidom.link"
custom_domain = true   # Wrangler will create the proxied DNS record on first deploy

# Static assets binding — the SPA build output.
# Wrangler uploads ./dist/ as the asset bundle; the Worker reads it via env.ASSETS.
[assets]
directory = "../dist"
binding = "ASSETS"
# Treat HTML as the SPA fallback for any 404; index.html is the shell.
not_found_handling = "single-page-application"
# We control cache headers ourselves in the Worker; disable Wrangler's defaults.
html_handling = "auto-trailing-slash"

# PR-preview assets — separate binding pointing at a sibling directory the
# workflow assembles by downloading the build artifact from PR runs.
[[env.preview.routes]]
pattern = "skyline-scroller.fidom.link/pr/*"
zone_name = "fidom.link"
custom_domain = false

[env.preview.assets]
directory = "../dist-pr"
binding = "PR_ASSETS"
not_found_handling = "single-page-application"

# Observability — free, low-volume.
[observability]
enabled = true
head_sampling_rate = 1.0
```

Notes:

- `custom_domain = true` is the modern equivalent of a route + DNS record pair — Wrangler creates a proxied DNS entry automatically on first deploy. See [Cloudflare docs — Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
- `not_found_handling = "single-page-application"` means any path under the assets root that doesn't match a file gets `index.html` returned with HTTP 200. This is the SPA fallback primitive.
- Asset directory paths are relative to the `wrangler.toml` file location (`worker/`), hence `../dist`.

### 4. `worker/src/index.ts` — Worker source

```ts
// worker/src/index.ts
// SPA outpost for skyline-scroller.fidom.link.
// Responsibilities:
//   1. Serve / from the ASSETS binding (Vite dist/).
//   2. Serve /pr/:n/* from the PR_ASSETS binding (PR previews), stripping the prefix.
//   3. Rewrite Cache-Control headers:
//        - immutable for content-hashed assets (vite emits assets/[name]-[hash].[ext]),
//        - short, must-revalidate for index.html so the shell updates promptly.
//   4. Strip trailing slashes on non-root paths (canonicalise URLs).

interface Env {
    ASSETS: Fetcher;
    PR_ASSETS?: Fetcher;
}

// Vite's default hashed-asset pattern: any file under /assets/ with a -[hash] segment.
const HASHED_ASSET = /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i;

function withCacheHeaders(res: Response, pathname: string): Response {
    const h = new Headers(res.headers);
    if (HASHED_ASSET.test(pathname)) {
        h.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (pathname === "/" || pathname.endsWith(".html")) {
        h.set("Cache-Control", "public, max-age=60, must-revalidate");
    } else {
        h.set("Cache-Control", "public, max-age=300");
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export default {
    async fetch(req: Request, env: Env): Promise<Response> {
        const url = new URL(req.url);
        // Canonicalise: strip trailing slash on non-root paths.
        if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
            url.pathname = url.pathname.replace(/\/+$/, "");
            return Response.redirect(url.toString(), 308);
        }
        // PR preview routing: /pr/42/foo → PR_ASSETS, path rewritten to /pr-42/foo.
        const pr = url.pathname.match(/^\/pr\/(\d+)(\/.*)?$/);
        if (pr && env.PR_ASSETS) {
            const [, n, rest] = pr;
            const inner = new URL(req.url);
            inner.pathname = `/pr-${n}${rest ?? "/"}`;
            const res = await env.PR_ASSETS.fetch(new Request(inner.toString(), req));
            return withCacheHeaders(res, inner.pathname);
        }
        // Production SPA path.
        const res = await env.ASSETS.fetch(req);
        return withCacheHeaders(res, url.pathname);
    },
} satisfies ExportedHandler<Env>;
```

~55 LOC including the file header comment. No external dependencies — only `@cloudflare/workers-types` for the `Fetcher`, `Env`, `ExportedHandler` types, which are dev-time only.

### 5. `worker/package.json`

```json
{
    "name": "skyline-scroller-outpost",
    "private": true,
    "version": "0.1.0",
    "type": "module",
    "scripts": {
        "deploy": "wrangler deploy",
        "dev": "wrangler dev",
        "typecheck": "tsc --noEmit"
    },
    "devDependencies": {
        "@cloudflare/workers-types": "^4.20260520.0",
        "typescript": "~5.9.3",
        "wrangler": "^3.95.0"
    }
}
```

Wrangler is pinned `^3.95.0` — the 3.x line is where assets binding is GA. **Do not bump to 4.x without re-validating** `not_found_handling` and `[assets]` block names; the 3→4 transition is the highest-risk drift surface (see R1).

### 6. `worker/tsconfig.json`

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noEmit": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "types": ["@cloudflare/workers-types"],
        "lib": ["ES2022"]
    },
    "include": ["src/**/*.ts"]
}
```

Mirrors the root `tsconfig.json` posture (bundler mode, `noEmit`, strict) but with `@cloudflare/workers-types` instead of `vite/client`.

### 7. New workflow — `.github/workflows/deploy-worker.yml`

```yaml
# .github/workflows/deploy-worker.yml
# Builds the SPA and deploys it to Cloudflare via Wrangler.
#
# Required GitHub repository secrets:
#   CF_API_TOKEN  — Cloudflare API token with permissions:
#                     Account → Workers Scripts → Edit
#                     Zone    → DNS            → Read     (for fidom.link)
#                     Zone    → Workers Routes → Edit     (for fidom.link)
#                   Create at https://dash.cloudflare.com/profile/api-tokens
#   CF_ACCOUNT_ID — Cloudflare account id (32-char hex), visible in dashboard URL.
#
# Optional secrets (PR-preview job, not yet wired in this iteration):
#   CF_PREVIEW_TOKEN — same scopes as CF_API_TOKEN, isolated for preview env.

name: Deploy Worker (Cloudflare)

on:
    push:
        branches: [main]
    workflow_dispatch:

concurrency:
    group: cf-worker
    cancel-in-progress: true

permissions:
    contents: read

jobs:
    deploy:
        runs-on: ubuntu-latest
        env:
            PUBLIC_BASE_PATH: /
        steps:
            - name: Checkout
              uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

            - name: Setup Node.js
              uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
              with:
                  node-version: 22
                  cache: npm

            - name: Install root deps
              run: npm ci

            - name: Build SPA
              run: npm run build

            - name: Install worker deps
              working-directory: worker
              run: npm install --no-package-lock

            - name: Deploy to Cloudflare
              uses: cloudflare/wrangler-action@392082e81fbedc8b04e7a8b3141ca5dd1ace62a3 # v3.14.0
              with:
                  workingDirectory: worker
                  apiToken: ${{ secrets.CF_API_TOKEN }}
                  accountId: ${{ secrets.CF_ACCOUNT_ID }}
                  command: deploy --assets ../dist
```

Notes:

- `cloudflare/wrangler-action@v3` is SHA-pinned (illustrative SHA — pin to the actual release SHA at apply time). Supply-chain hygiene per [[decisions/DEC-05-low-code-config]] §6.
- `--assets ../dist` overrides `wrangler.toml`'s `[assets].directory`, making the workflow self-documenting about which directory ships.
- Tests are intentionally not re-run here — CI gates `main` before merge. If you want belt-and-suspenders, add `npm test` between build and deploy; trade-off is ~20 s of deploy latency for redundant signal.

### 8. DNS step (manual, one-time)

With `custom_domain = true` in `wrangler.toml`, **Wrangler creates the proxied DNS record automatically** on the first successful `wrangler deploy`. No manual DNS work is needed if the API token has Zone DNS:Edit on `fidom.link`.

If for any reason the token lacks DNS:Edit (e.g. user issued a narrower token), fall back to manual setup in the Cloudflare dashboard:

1. Open `fidom.link` zone → DNS → Records → Add record.
2. Type `CNAME`, Name `skyline-scroller`, Target `100::` (Cloudflare's IPv6 black-hole — the Worker route intercepts before the origin is reached), Proxy status **Proxied** (orange cloud).
3. Save. Propagation is < 1 minute on Cloudflare.

Reference: [Cloudflare docs — Workers Custom Domains and Routes](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

The `100::` black-hole trick is documented in the Cloudflare community and works because the proxied flag means Cloudflare intercepts the request at the edge before any origin resolution — the destination IP is never actually contacted.

### 9. Manual auth setup (user, one-time)

The user must do these steps **once**, before the first deploy can succeed. The workflow will fail with `Authentication error [code: 10000]` if any are skipped — that failure mode is the diagnostic.

1. **Create a Cloudflare API token.**
   - Go to https://dash.cloudflare.com/profile/api-tokens → "Create Token" → "Create Custom Token".
   - Name: `skyline-scroller-deploy`.
   - Permissions:
     - Account → Workers Scripts → **Edit**
     - Zone → DNS → **Edit** (so `custom_domain = true` can self-provision)
     - Zone → Workers Routes → **Edit**
   - Zone Resources: Include → Specific zone → `fidom.link`.
   - Account Resources: Include → the user's account.
   - TTL: leave default (no expiry) or set 1 year.
   - Continue → Create → **copy the token immediately** (only shown once).

2. **Find the Cloudflare account id.**
   - Open https://dash.cloudflare.com/ → any zone → the URL contains the account id as the second path segment (32-char hex), or it's shown in the right sidebar of the zone overview.

3. **Add GitHub repository secrets.**
   - Repo → Settings → Secrets and variables → Actions → New repository secret.
   - `CF_API_TOKEN` = the token from step 1.
   - `CF_ACCOUNT_ID` = the id from step 2.

4. **First deploy is manual.**
   - From the GitHub Actions tab, run `Deploy Worker (Cloudflare)` via `workflow_dispatch` once.
   - On success, Wrangler creates the `skyline-scroller.fidom.link` proxied DNS record automatically.
   - Verify by visiting https://skyline-scroller.fidom.link/ — should serve the latest main build.

### 10. PR-preview wiring (iteration 2)

Not in this initial PR — flagged as iteration-2 work to keep the first delivery small:

- A second workflow `pr-preview-worker.yml` triggered by `pull_request` events.
- On `opened`/`synchronize`/`reopened`: build with `PUBLIC_BASE_PATH=/pr/${PR_NUMBER}/`, deploy to the `preview` env (`wrangler deploy --env preview --assets ../dist`), but uploaded under a key namespaced by PR number.
- On `closed`: cleanup script removes that PR's asset namespace.
- Each PR gets a comment with `https://skyline-scroller.fidom.link/pr/<N>/`.

For iteration 1, **GitHub Pages PR previews keep working** (the existing `pr-preview.yml` is untouched). Users get both URLs in the PR comment thread until iteration 2 retires the Pages preview.

### 11. Coexistence with GitHub Pages

Keep `.github/workflows/deploy.yml` (Pages) running for **~2 weeks** post-Worker-launch. Rationale:

- If the Worker deploy regresses (e.g. cache headers wrong, a route misconfigured), the user can immediately fall back to `*.github.io/skyline-scroller/` — known-working.
- DNS propagation is fast but not instant; some networks may cache resolution failures.
- The Wrangler 3.x → 4.x migration risk (see R1) is mitigated by having a parallel deploy path.

After two weeks of green Worker deploys with no rollback events, deprecate Pages in a follow-up PR:

- Remove `.github/workflows/deploy.yml` and `.github/workflows/pr-preview.yml`.
- Update `README.md` canonical URL.
- Disable Pages in repo Settings → Pages.
- Update [[operations/build-deploy]] to drop the Pages section.

## Acceptance criteria

1. **Production URL serves the latest main.** Visiting `https://skyline-scroller.fidom.link/` returns HTTP 200 with the latest `dist/index.html` contents. Hard-refresh (Cmd-Shift-R) returns the same build SHA as the most recent `Deploy Worker (Cloudflare)` run.
2. **Hashed assets are immutable-cached.** `curl -I https://skyline-scroller.fidom.link/assets/index-<hash>.js` returns `Cache-Control: public, max-age=31536000, immutable`.
3. **`index.html` is short-cached.** `curl -I https://skyline-scroller.fidom.link/` returns `Cache-Control: public, max-age=60, must-revalidate`.
4. **ETag and Last-Modified honoured.** `curl -I` includes both headers from the assets binding; a conditional `If-None-Match` request returns 304.
5. **SPA fallback works.** `curl -s https://skyline-scroller.fidom.link/some/deep/route` returns the SPA shell (200 with `index.html` body), not a 404.
6. **Trailing-slash canonicalisation.** `curl -I https://skyline-scroller.fidom.link/foo/` returns 308 → `/foo`.
7. **PR-preview routing (after iteration 2).** `https://skyline-scroller.fidom.link/pr/42/` serves the build of PR #42.
8. **Deploy completes in < 90 s.** From workflow trigger to "deploy successful" log line, including `npm ci`, `npm run build`, asset upload. Wrangler asset upload is content-addressed and deduplicated — re-deploys of unchanged files are near-instant.
9. **GitHub Pages stays green** during the coexistence window. The two deploys are independent and don't share state.

## Risks

### R1 — Wrangler version drift

The static-assets binding API has evolved across Wrangler versions:

- Wrangler 3.78+ introduced the GA `[assets]` block with `directory` and `binding`.
- Wrangler 4.x is on the horizon and may rename fields or change `not_found_handling` semantics.

**Mitigation**: pin `wrangler ^3.95.0` in `worker/package.json`. Pin `cloudflare/wrangler-action` to a specific SHA. Renovate/Dependabot bumps to the Worker package get reviewed manually. Acceptance criteria #2-#5 above are the regression net — if a Wrangler bump breaks asset binding, those headers/fallback tests fail.

### R2 — User has no CF API token yet

The first deploy run will fail with `Authentication error [code: 10000]` until the user does §9. **Mitigation**: this ADR's §9 is explicit and ordered. The failure mode is well-known and the error message is searchable. We accept that the first PR landing this work will have a red `deploy-worker.yml` run until the secrets are added; this is by design and is documented in the PR description.

### R3 — DNS propagation delay

With `custom_domain = true`, Wrangler provisions the DNS record on first deploy, but Cloudflare's edge can take up to 60 seconds to propagate. **Mitigation**: the first deploy's acceptance check should be done ~2 min after deploy success, not immediately. Document this in the PR description so reviewers don't false-positive on a 5-second-old "doesn't work" check.

### R4 — `fidom.link` zone not actually on the same Cloudflare account as the API token

If the user has multiple Cloudflare accounts (personal + work), the API token must be scoped to the account that owns `fidom.link`. **Mitigation**: §9 step 1 explicitly says "Include → Specific zone → `fidom.link`", which forces the user to confirm the zone is visible to the token-issuing account. If it isn't, the token creation UI itself surfaces the mismatch.

### R5 — Asset-binding cost model changes

Cloudflare Workers Assets is currently free up to 100 000 requests/day, and asset reads don't count against CPU time. If Cloudflare changes the pricing model (announced or silent), the project could start incurring charges. **Mitigation**: enable Cloudflare's spending notification at $0.01 on the account. Workers Free tier has been stable since 2019; the probability is low but not zero.

### R6 — PR-preview path collisions with SPA routes

If the SPA itself ever introduces a `/pr/...` route (e.g. for "project releases"), the Worker would intercept it as a preview-routing request before the SPA's client-side router sees it. **Mitigation**: the SPA does not currently use client-side routing (it's a single-canvas app with no `<Router>`). If routing is added later, namespace previews under `/_pr/` instead and update §4 accordingly.

### R7 — Wrangler-action SHA pinning drift vs upstream releases

A SHA-pinned action stops receiving improvements until manually bumped. **Mitigation**: enable Dependabot grouping for `github-actions` (per [[decisions/DEC-05-low-code-config]] §R6) so action bumps batch into one weekly PR.

### R8 — `compatibility_date = "2026-05-20"` vs runtime API changes

A future Cloudflare runtime version could rename or deprecate the `ASSETS` fetcher API. **Mitigation**: `compatibility_date` is sticky — Workers honour the declared date and don't apply newer runtime breakers. Bumping the date is an explicit, reviewed change. Quarterly review is sufficient.

### R9 — Custom-domain route conflicts with Pages

If GitHub Pages and the Cloudflare Worker both somehow claim `skyline-scroller.fidom.link`, the user wouldn't be able to A/B test. **Mitigation**: this can't happen in practice — Pages serves on `*.github.io` only; the subdomain CNAME points at Cloudflare's edge. There is no path for Pages to receive a request for `skyline-scroller.fidom.link`. Documented for completeness.

## References

- `.github/workflows/deploy.yml` — existing Pages deploy, kept as fallback during coexistence
- `.github/workflows/pr-preview.yml` — existing Pages PR-preview, kept until iteration 2
- `.github/workflows/ci.yml` — unchanged; CI gates `main` before Worker deploy runs
- `package.json` — root SPA manifest, untouched by this decision
- `vite.config.ts` (from DEC-05) — produces `dist/` with `base=/` when `PUBLIC_BASE_PATH=/`
- Cloudflare docs — [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- Cloudflare docs — [Custom Domains for Workers](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- Cloudflare docs — [Wrangler configuration reference](https://developers.cloudflare.com/workers/wrangler/configuration/)
- Cloudflare docs — [API tokens — create custom token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- GitHub Action — [`cloudflare/wrangler-action`](https://github.com/cloudflare/wrangler-action)
- Related: [[operations/build-deploy]], [[decisions/DEC-05-low-code-config]], [[entities/Deploy Workflow]], [[entities/PR Preview Workflow]]
