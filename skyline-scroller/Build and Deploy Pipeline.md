# Build Process and CI/CD Pipelines

The Skyline Scroller project uses modern web tooling for its build process, primarily relying on [Vite](https://vitejs.dev/) and TypeScript. The CI/CD pipelines are fully automated via GitHub Actions, ensuring consistent checks and seamless deployment to GitHub Pages.

## The Vite Build Process

The project is structured as an ESM-based package (`"type": "module"` in `package.json`). Vite acts as both the local development server and the production bundler.

Available NPM scripts:
- `npm run dev`: Starts the Vite development server with Hot Module Replacement (HMR).
- `npm run build`: The primary production build script. It executes `tsc && vite build`.
  - `tsc`: Runs the TypeScript compiler in a type-checking-only mode (if configured with `--noEmit`, though the standard command just ensures the code compiles).
  - `vite build`: Bundles the application, minifying the TypeScript and CSS resources into a static `dist` folder.
- `npm run preview`: Locally serves the production `dist` build to verify behavior before deployment.

The Vite configuration (usually defined in `vite.config.ts`, though parameters can be passed via CLI) is set to bundle the application using `--base=/skyline-scroller/`. This base path ensures that all static assets (like JS modules and the [[CSS Architecture|CSS bundle]]) resolve correctly when hosted under a subdirectory URL (like GitHub Pages).

## GitHub Actions Workflows

The repository uses two primary GitHub Actions workflows located in `.github/workflows/`. Both are configured to run on the `main` branch.

### 1. Continuous Integration (`ci.yml`)
The CI workflow ensures that code pushed to `main` or proposed via Pull Requests remains healthy.
- **Triggers**: `push` to `main`, and `pull_request` targeting `main`.
- **Environment**: Ubuntu, running Node.js version 22.
- **Steps**:
  1. Checks out the code.
  2. Sets up Node.js with NPM caching to speed up subsequent runs.
  3. Installs dependencies (`npm ci`).
  4. Runs explicit Type Checking (`npx tsc --noEmit`) to catch strict TypeScript errors.
  5. Performs a test build (`npx vite build --base=/skyline-scroller/`) to ensure the bundler succeeds without crashing.

*(Note: There is a stubbed out testing step in the CI file, intended for a future framework like Vitest).*

### 2. Deployment Pipeline (`deploy.yml`)
The deployment workflow takes the successful build and automatically publishes it to GitHub Pages.
- **Triggers**: `push` to `main` and manual triggers (`workflow_dispatch`).
- **Permissions**: Requires specialized permissions (`pages: write`, `id-token: write`) to interface securely with the GitHub Pages deployment API.
- **Concurrency**: Grouped by `pages` to ensure that multiple rapid pushes don't result in parallel deployments overwriting each other inconsistently.
- **Steps**:
  - **Build Job**: Identical setup to the CI run. It executes the build with the explicit `--base=/skyline-scroller/` flag. The resulting `./dist` folder is packaged via the `actions/upload-pages-artifact` action.
  - **Deploy Job**: Depends on the build job. Uses `actions/deploy-pages` to take the uploaded artifact and push it to the live GitHub Pages environment.

This unified pipeline ensures that any commit merged to `main` is rigorously type-checked, bundled via Vite, and automatically pushed live to the web.
