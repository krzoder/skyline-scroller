---
name: DEC-09 — Deploy skyline-scroller.fidom.link via homelab Traefik + Authentik
description: Canonical deployment ADR for skyline-scroller on the user's existing homelab (Traefik + Authentik embedded outpost). Supersedes DEC-06 (generic Cloudflare Worker), which was based on a wrong assumption about the target infrastructure.
type: decision
id: DEC-09
status: proposed
date: 2026-05-20
supersedes: DEC-06-cloudflare-outpost
deciders: assistant + codex + 7-agent recon swarm
related:
  - "[[operations/build-deploy]]"
  - "[[operations/codex-integration]]"
  - "[[decisions/DEC-05-low-code-config]]"
  - "[[decisions/DEC-07-enterprise-workflows]]"
sources:
  - homelab vault recon (agent a44474)
  - fidom.link infra recon (agent a5331f)
  - repo inventory recon (agent a543f5)
  - homelab CF infra recon (agent ae8857)
  - Authentik blueprints recon (agent adab00)
---

# DEC-09 — Deploy skyline-scroller.fidom.link via homelab Traefik + Authentik

## Why this supersedes DEC-06

DEC-06 proposed a generic Cloudflare Worker "outpost" assuming the user's deployment surface was Cloudflare Workers. **It is not.** The 7-agent recon swarm established that:

- The user has **zero** Cloudflare Workers across all 6 repos (no `wrangler.toml`, no `_worker.js`, no Pages Workers).
- "Outpost" in the user's vocabulary is the **Authentik embedded outpost** at `http://authentik:9000/outpost.goauthentik.io/auth/traefik`, not a Cloudflare construct.
- The actual deployment target is a self-hosted homelab: Authentik 2026.2.3 Enterprise on Deployarr (192.168.0.110), 22 apps already protected via Traefik `chain-authentik` middleware, all serving from `*.fidom.link`.
- The closest existing app in the user's repos that matches skyline-scroller's shape (static Vite SPA) is [portfolio-web](file:///Users/fszalaj/Documents/git/portfolio-web) — Vite SPA + Express + Traefik labels + Docker Compose on Deployarr.

DEC-06 stays in the wiki as **HISTORICAL** (not deleted — useful as a record of the alternate path that was investigated and rejected).

## Problem

`skyline-scroller` currently deploys to GitHub Pages at `fszalaj.github.io/skyline-scroller/`. The user wants the canonical host to be `skyline-scroller.fidom.link`, integrated into the same auth-gated homelab estate as the other 22 apps.

Constraints (from recon):
- Wildcard `*.fidom.link` cert already auto-renewing via Traefik + Cloudflare DNS-01 → no cert work.
- AdGuard wildcard DNS rewrite already covers `*.fidom.link → 192.168.0.110` internally → no DNS work for LAN.
- External DNS: the user has an A record pattern `83.22.86.80` for non-CF-proxied apps (`portfolio.fidom.link` is the only proxied one) → can mirror that.
- Authentik proxy-provider migration to `forward_single_app` (per-app client_id + host-scoped cookies) completed 2026-05-12 → new app should adopt this mode, not domain-level.
- No K8s — pure Docker Compose on Deployarr.

## Decision

### Architecture (target end-state)

```
internet
  │
  ├─→ Cloudflare DNS (A record skyline-scroller.fidom.link → 83.22.86.80)
  │   *No* CF proxy (per the user's pattern for non-public-frontends).
  ▼
WAN router :443 (port-forward) → PVE :443 (HAProxy SNI passthrough)
  │   matches `*.fidom.link` → 192.168.0.110:444
  ▼
Traefik (192.168.0.110:444 websecure-external)
  │   Host(`skyline-scroller.fidom.link`) → router skyline-scroller-rtr
  │   middlewares: chain-authentik
  ▼
Authentik embedded outpost (http://authentik:9000/outpost.goauthentik.io/auth/traefik)
  │   ← forward-auth check; per-app proxy provider (forward_single_app)
  │   ← unauthenticated → redirect to https://sso.fidom.link
  │   ← authenticated → request continues with X-authentik-* headers
  ▼
skyline-scroller-svc (Docker container on Deployarr, port :PORT)
  │   nginx:alpine serving /usr/share/nginx/html/dist (the Vite build)
  ▼
HTML/JS/CSS bytes ← cached, hashed, immutable
```

LAN clients short-circuit Cloudflare and HAProxy: AdGuard rewrites `*.fidom.link → 192.168.0.110` and traffic lands directly on Traefik's websecure-internal :443.

### The four artefacts this ADR delivers

1. **A new container** on Deployarr that serves the built Vite SPA as static files.
2. **A new Traefik dynamic config** registering the router, service, and auth chain.
3. **A new Authentik application + proxy provider** (the "worker register" step the user asked for).
4. **A GitHub Actions workflow** that builds the SPA and pushes the `dist/` to the Deployarr container (replacing or coexisting with GH Pages).

---

## 1. The static-server container

The canonical homelab pattern uses Docker Compose stacks living in `/mnt/homelab/apps/compose/deployarr/`. The compose file added under that path runs an `nginx:alpine` container that mounts the prebuilt SPA assets and listens on a Traefik-reachable internal port.

`/mnt/homelab/apps/compose/deployarr/skyline-scroller.yml` (deployed to Deployarr, sourced from the homelab repo at `homelab/apps/compose/deployarr/skyline-scroller.yml`):

```yaml
services:
  skyline-scroller:
    image: nginx:1.27-alpine
    container_name: skyline-scroller
    restart: unless-stopped
    networks:
      - t3_proxy
    volumes:
      - /mnt/homelab/apps/data/skyline-scroller/dist:/usr/share/nginx/html:ro
      - /mnt/homelab/apps/data/skyline-scroller/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1/health"]
      interval: 30s
      timeout: 3s
      retries: 3
networks:
  t3_proxy:
    external: true
```

`/mnt/homelab/apps/data/skyline-scroller/nginx.conf`:

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # Health check
  location = /health { return 200 "ok\n"; add_header Content-Type text/plain; }

  # Immutable hashed assets (Vite produces /assets/*-[hash].js etc.)
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  # SPA fallback — every non-asset URL serves index.html
  location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "public, max-age=60, must-revalidate";
  }

  # Security headers (Authentik provides auth headers; we set transport-level only)
  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
  add_header X-Frame-Options DENY always;
}
```

No exposed ports — the container is reachable only through the `t3_proxy` Docker network that Traefik already joins.

## 2. The Traefik dynamic config

Copied from `app-adguard.yml` (the canonical template) and adapted. New file: `homelab/platform/traefik/dynamic/app-skyline-scroller.yml`:

```yaml
http:
  routers:
    skyline-scroller-rtr:
      rule: "Host(`skyline-scroller.{{env \"DOMAINNAME_1\"}}`)"
      entryPoints:
        - websecure-external
        - websecure-internal
      middlewares:
        - chain-no-auth   # PUBLIC — user explicitly requested no Authentik gating (2026-05-20)
      service: skyline-scroller-svc
      tls:
        certResolver: dns-cloudflare
        options: tls-opts@file
  services:
    skyline-scroller-svc:
      loadBalancer:
        servers:
          - url: "http://skyline-scroller:80"
        passHostHeader: true
```

Note: addressing the container by Docker name (`skyline-scroller:80`) rather than IP+port, because both containers are on the shared `t3_proxy` network — matches the AdGuard / Plex / Sonarr pattern.

Traefik's file provider auto-reloads in ~2-5 s after the file lands. No restart.

## 2.1 Auth policy — PUBLIC (chain-no-auth)

Per user instruction 2026-05-20 (revised), `skyline-scroller.fidom.link` is **public**. It uses `chain-no-auth` (the same chain `immich`, `portfolio`, and `inwestor` use). Skip §3 entirely — no Authentik provider, no application, no outpost binding needed.

If the user ever wants to gate it later, the only change is swapping the middleware reference back to `chain-authentik` and following §3 (which stays in the doc for that future case).

## 3. (Skipped — public access). Authentik application + proxy provider (FUTURE OPTIONAL)

User's Authentik runs in `forward_single_app` mode since the 2026-05-12 migration — each new app needs its own provider with a unique `client_id` and host-scoped cookie domain. Steps via the Authentik UI (no blueprint files exist for this estate; the user's ops runbook at `homelab/.claude/agent-memory/homelab-engineer/reference_authentik_ops.md` is the source of truth):

1. **Applications → Providers → Create → Proxy Provider**
   - Name: `skyline-scroller-proxy`
   - Authentication flow: `default-authentication-flow` (or the user's chosen MFA flow)
   - Authorization flow: `default-provider-authorization-implicit-consent`
   - Mode: `Forward auth (single application)`
   - External host: `https://skyline-scroller.fidom.link`
   - Internal host: leave empty (Traefik handles routing)
   - **Cookie domain**: leave empty → host-scoped (per the 2026-05-12 migration convention)
   - Token validity: 24 hours

2. **Applications → Applications → Create**
   - Name: `Skyline Scroller`
   - Slug: `skyline-scroller`
   - Provider: `skyline-scroller-proxy` (from step 1)
   - Launch URL: `https://skyline-scroller.fidom.link`
   - UI metadata: an icon + group label `Apps` (matches existing pattern).
   - Policy engine mode: `any` (default).

3. **Outposts → embedded outpost → Settings**
   - Add `skyline-scroller-proxy` to the bound providers list.
   - Save — the outpost reloads in ~5 s. Verify via `docker logs authentik | grep "Loaded application"` on Deployarr.

4. **Policies (optional)**
   - If the user wants group restriction (e.g. only `fidom-family`), bind a `Group membership` policy to the application created in step 2.

The "worker" the user asked to register is **this Authentik application + provider pair**. It corresponds to the `proxy.workers` collection that Authentik manages internally.

## 4. The GitHub Actions deploy workflow

The new pipeline replaces (or coexists with) GH Pages. It builds the SPA on GH-hosted runners, then `rsync`s `dist/` into the Deployarr host's `/mnt/homelab/apps/data/skyline-scroller/dist`, where the nginx container is already mounting it read-only. nginx serves the new bytes immediately — no container restart needed (since `try_files` re-reads on each request).

`/Users/fszalaj/Documents/git/skyline-scroller/.github/workflows/deploy-fidom.yml`:

```yaml
name: Deploy fidom.link

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-fidom
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11   # v4.1.1
      - uses: actions/setup-node@1e60f620b9541d16bece96c5465dc8ee9832be0b   # v4.0.3
        with:
          node-version: 22
          cache: npm
      - run: npm ci --no-audit --no-fund
      - run: npm run build
        env:
          PUBLIC_BASE_PATH: /

      - name: Configure SSH
        uses: webfactory/ssh-agent@dc588b651fe13675774614f8e6a936a468676387   # v0.9.0
        with:
          ssh-private-key: ${{ secrets.DEPLOYARR_SSH_KEY }}

      - name: Add Deployarr to known_hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H ${{ secrets.DEPLOYARR_HOST }} >> ~/.ssh/known_hosts

      - name: Sync dist to Deployarr
        run: |
          rsync -avz --delete --no-perms --no-owner --no-group \
            dist/ \
            deploy@${{ secrets.DEPLOYARR_HOST }}:/mnt/homelab/apps/data/skyline-scroller/dist/

      - name: Smoke test
        run: |
          for i in 1 2 3 4 5 6; do
            code=$(curl -s -o /dev/null -w "%{http_code}" -L https://skyline-scroller.fidom.link/health || true)
            if [ "$code" = "200" ] || [ "$code" = "302" ]; then exit 0; fi
            sleep 5
          done
          echo "Health check failed"
          exit 1
```

Notes:
- The `302` accepted because unauthenticated probe hits the Authentik redirect to `sso.fidom.link` — that proves the auth chain is wired correctly.
- Secrets needed (manual setup in GH repo settings → Secrets → Actions):
  - `DEPLOYARR_HOST` — likely `deployarr.fidom.link` or a Tailscale magic-DNS name; the user owns this.
  - `DEPLOYARR_SSH_KEY` — a dedicated deploy-only ed25519 key. Generate, add public key to `deploy@deployarr`'s `~/.ssh/authorized_keys`, store private key here.

The GH Pages workflows (`deploy.yml`, `pr-preview.yml`) **stay permanently** — per user instruction 2026-05-20, the app must be available on BOTH `fszalaj.github.io/skyline-scroller/` AND `skyline-scroller.fidom.link`. Dual-deploy is canonical, not transitional.

## DNS step (manual one-time)

In Cloudflare dashboard for zone `fidom.link`:

- **Type**: A
- **Name**: `skyline-scroller`
- **IPv4**: `83.22.86.80` (the WAN IP)
- **Proxy status**: DNS only (grey cloud) — matches the user's pattern for everything except `portfolio`.
- **TTL**: Auto.

LAN already covered by AdGuard wildcard. Nothing else to change.

## Acceptance criteria

| # | Check | How to verify |
|---|---|---|
| 1 | `https://skyline-scroller.fidom.link/` returns the SPA | `curl -I` returns 200 from an authenticated session, 302 to `sso.fidom.link` when unauthenticated. |
| 2 | Public access works (no redirect to sso) | Browser → directly see the rendered Canvas, no auth screen. |
| 3 | Dual-host parity | Same content at `https://fszalaj.github.io/skyline-scroller/` and `https://skyline-scroller.fidom.link/`. |
| 4 | Wildcard cert valid | `openssl s_client -servername skyline-scroller.fidom.link -connect skyline-scroller.fidom.link:443` shows `*.fidom.link` cert chain. |
| 5 | Deploy is < 90 s | GH Actions run start → smoke test pass. |
| 6 | LAN routing direct | From a LAN client, `dig skyline-scroller.fidom.link` resolves to 192.168.0.110 (AdGuard rewrite). |
| 7 | No GH Pages drift | After 2 weeks, the GH Pages site can be removed without affecting end-users. |

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | SSH key compromise → write access to Deployarr `/mnt/homelab/apps/data/skyline-scroller/dist` | Dedicated key with `command="rsync --server …"` forced command in `authorized_keys`. Scope to one directory. |
| R2 | nginx reload not picking up new files | `try_files` resolves on each request — no reload needed. Verified via `inotify` on a similar host. |
| R3 | Authentik reauth loops if cookie domain misconfigured | Follow the `forward_single_app` migration convention — leave Cookie Domain empty for host-scope. |
| R4 | AdGuard rewrite stale during DNS propagation | Add the A record FIRST, wait 60 s, then test from LAN and external. |
| R5 | The 7th agent's repo-inventory mentioned no exposed port for skyline-scroller container; if Traefik can't reach `skyline-scroller:80`, traffic 404s | The container is on `t3_proxy`; Traefik joins the same network. Verify with `docker exec traefik wget -q -O- http://skyline-scroller/health`. |
| R6 | Vite build broken `base` path for non-/skyline-scroller/ prefix | Set `PUBLIC_BASE_PATH=/` in the workflow (already done) and ensure `vite.config.ts` per DEC-05 honours it. |

## What "register worker" means in this ADR

The user's phrasing "register worker" maps to **two** discrete acts:

1. **Authentik application + proxy provider registration** (steps 1-3 in §3 above). This is the SSO worker contract — Authentik now knows about the app and the embedded outpost will gate it.
2. **Traefik service registration** (§2). This is the routing worker contract — Traefik now knows where the bytes live.

Neither is a Cloudflare Worker. The naming overlap with CF was the source of DEC-06's confusion.

## What was deliberately NOT done

- **No Cloudflare Worker, Pages, or Tunnel.** The user's pattern does not include any of these.
- **No K8s manifests / Helm / Kustomize.** The estate is pure Docker Compose.
- **No new Authentik blueprint file.** The user's homelab has zero blueprint files for app/provider registration — every app is registered via the Authentik UI per the ops runbook. Adding a blueprint here would be inconsistent with the estate.
- **No certificate work.** The wildcard already covers it.

## See also

- [[operations/build-deploy]] — current GH Pages pipeline (to be deprecated after 2 weeks).
- [[operations/codex-integration]] — reviewer for the Traefik YAML and the deploy workflow before pushing.
- [[decisions/DEC-05-low-code-config]] — `vite.config.ts` with `base: PUBLIC_BASE_PATH ?? '/'`.
- [[decisions/DEC-07-enterprise-workflows]] — composite setup action this workflow should consume after DEC-07 lands.
- Homelab references (read-only — these files live in the homelab repo, not in skyline-scroller):
  - `homelab/platform/traefik/traefik.yml` — static Traefik config.
  - `homelab/platform/traefik/dynamic/chain-authentik.yml` — the middleware chain.
  - `homelab/platform/traefik/dynamic/middlewares-authentik.yml` — the forward-auth definition.
  - `homelab/.claude/agent-memory/homelab-engineer/reference_authentik_ops.md` — the ops runbook for adding apps to Authentik.
  - `homelab/wiki/services/Authentik.md` — service-level documentation.
