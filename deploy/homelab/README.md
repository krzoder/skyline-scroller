# Homelab deployment artefacts — `skyline-scroller.fidom.link`

This folder contains the files needed to deploy this app on the user's
homelab Traefik + nginx stack (per [[wiki/decisions/DEC-09-homelab-deploy]]).

The contents here are **source-of-truth**. They get copied into the homelab
repo (`~/Documents/git/homelab/`) at specific paths during the first-time
setup, then kept in sync by the `deploy-fidom.yml` workflow.

## Files

| File | Target path in homelab | Purpose |
|---|---|---|
| `docker-compose.yml` | `/mnt/homelab/apps/compose/deployarr/skyline-scroller.yml` | nginx:alpine container serving the SPA |
| `nginx.conf` | `/mnt/homelab/apps/data/skyline-scroller/nginx.conf` | SPA fallback + cache headers |
| `traefik-app-skyline-scroller.yml` | `homelab/platform/traefik/dynamic/app-skyline-scroller.yml` | Traefik dynamic router (public, no auth) |

## First-time setup (run once on Deployarr)

```bash
# 1. Copy compose file
sudo mkdir -p /mnt/homelab/apps/compose/deployarr/
sudo cp docker-compose.yml /mnt/homelab/apps/compose/deployarr/skyline-scroller.yml

# 2. Copy nginx config + ensure dist mount exists
sudo mkdir -p /mnt/homelab/apps/data/skyline-scroller/dist
sudo cp nginx.conf /mnt/homelab/apps/data/skyline-scroller/nginx.conf

# 3. Add Traefik route via homelab repo (do this from the homelab clone, not here)
cp traefik-app-skyline-scroller.yml ~/Documents/git/homelab/platform/traefik/dynamic/app-skyline-scroller.yml
cd ~/Documents/git/homelab && git add platform/traefik/dynamic/app-skyline-scroller.yml && git commit -m "wiki: add skyline-scroller traefik route"

# 4. DNS in Cloudflare dashboard for fidom.link:
#    A record `skyline-scroller` -> 83.22.86.80, proxy DNS-only (grey cloud)

# 5. Start the container
docker compose -f /mnt/homelab/apps/compose/deployarr/skyline-scroller.yml up -d
```

## Continuous deployment

After first-time setup, the `.github/workflows/deploy-fidom.yml` workflow
keeps `/mnt/homelab/apps/data/skyline-scroller/dist/` synced with each
push to `main`. nginx serves the new bytes immediately — no container
restart needed.

## Verification

```bash
# From outside:
curl -I https://skyline-scroller.fidom.link/        # 200
curl -I https://skyline-scroller.fidom.link/health  # 200

# From LAN (resolves via AdGuard wildcard to 192.168.0.110):
dig skyline-scroller.fidom.link    # -> 192.168.0.110
```
