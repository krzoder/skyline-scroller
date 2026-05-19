import { defineConfig } from 'vite';

// Base path lives in env var so:
//  - local `npm run build` produces a working artefact (default '/').
//  - GitHub Pages workflow passes PUBLIC_BASE_PATH=/skyline-scroller/.
//  - fidom.link homelab workflow leaves it as '/' (subdomain root).
//  - Cloudflare-Workers-style fallback can pass any subpath later.
// Previously the base path lived only in CLI flags in each workflow — making
// `npm run build` produce a different artefact than CI deployed. Per DEC-05.
export default defineConfig({
    base: process.env.PUBLIC_BASE_PATH ?? '/',
    define: {
        __PACKAGE_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
    },
});
