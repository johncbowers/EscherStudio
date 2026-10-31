# Escher Studio

[Open Escher Studio](https://johncbowers.github.io/EscherStudio/) · [Source repository](https://github.com/johncbowers/EscherStudio)

A browser-only laboratory for hierarchical combinatorial tilings, inspired by John C. Bowers and Dakota Lawson's [Bridges 2024 paper](https://archive.bridgesmathart.org/2024/bridges2024-455.pdf). React, TypeScript and Vite; no backend, Python runtime, credentials, or remote numerical services. Fonts use system fallbacks; built assets have no external runtime dependencies.

## Run locally

Node.js 22 or later:

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite (normally `http://127.0.0.1:5173`). A web server is required for ES modules and the worker; do not double-click `index.html`.

```sh
npm test
npm run build
npm run preview
```

The build is in `dist/`. Numerical and subdivision work runs in a module worker. Changing settings terminates the previous worker; Cancel stops a computation. A 30-second timeout and size limits bound expensive work.

## Try it

1. Start with Chair, Sphinx, Pinwheel, Domino, Quad, Triangle, or Two species. Run the script after editing (Cmd/Ctrl+Enter).
2. Rule diagram shows one subdivision with vertex labels. Use the prototile menu for multi-type rules.
3. Recursive tiling applies the rule at depths 0–7. Color by ancestor groups leaf tiles by a chosen hierarchy level, with aggregate boundaries emphasized.
4. Click a tile, then its ancestors in the inspector. Drag to pan, scroll or use buttons to zoom, and Fit to reset.
5. Choose Tutte or experimental Euclidean circle packing. Inspect the numerical residuals and convergence status.
6. Export the current drawing as SVG. Open/Save script uses local files. The draft is also saved in this browser's localStorage (best effort; no server sync).

The text language is **new for this app**. It expresses Escher/KoebePy's data model; it does not claim compatibility with an unrecovered historical Escher grammar. See [Language](docs/LANGUAGE.md).

## GitHub Pages

1. Put these files in a GitHub repository with a `main` branch, including `package-lock.json`.
2. In Settings → Pages → Build and deployment, choose **GitHub Actions**.
3. Push to `main`, or manually run “Test and deploy GitHub Pages”. Pull requests run checks without deploying.

The workflow tests, builds, uploads `dist/`, and deploys it. Vite uses `base: './'`, so assets and the module worker work under both a repository URL (`/EscherWeb/`) and an account root. No client routing or SPA fallback is needed. Change the workflow branch if your default branch differs. Deployment is managed by `.github/workflows/pages.yml` in the EscherStudio repository.

## Implemented mathematics

- Oriented polygonal cell complexes, positional prototile-to-child vertex correspondence, edge split interning with direction reversal, face-local interior vertices, and explicit parent/path hierarchy.
- Each rule is checked for a simple split parent boundary, opposite directed interior edge incidences, connected manifold vertex links (including valence-two interior vertices), one boundary component, all vertices used, and disk Euler characteristic.
- Every generated level is revalidated. Incompatible shared-edge split counts fail with a diagnostic instead of silently creating cracks.
- Tutte: equally spaced convex boundary, sparse Dirichlet graph Laplacian, Jacobi-preconditioned conjugate gradient, measured barycenter residual.
- Packing: star triangulation, Euclidean log-radius angle equations, sparse damped Newton steps with residual-decreasing backtracking, conjugate-gradient inner solves, oriented dual-graph development, and measured relative tangency error. Boundary radii are fixed equal. This is **not GOPack**, and is **not** the maximal hyperbolic packing used in the paper.

## Limits and next work

- Generated patches are finite disks from one initial tile. No direct limits, arbitrary multi-tile seeds, geometric coordinate declarations, reflection syntax, or boundary gluing declarations yet.
- The engine supports directed edge splits with any number of named vertices; conflicting counts on actual shared edges are detected during generation. It does not prove compatibility for all future depths.
- Tutte's classical nondegeneracy guarantee has connectivity hypotheses. Disk validation alone is not a universal guarantee of strictly convex faces for every admissible user rule. Degenerate embeddings can occur for weakly connected examples; the solver reports harmonic residual, not a general geometric certificate.
- Euclidean packing is experimental and limited to 7,000 circles, 60 Newton steps, and finite numerical ranges. Angle and edge errors are reported. Global non-overlap is tested for representative small examples, **not certified for arbitrary scripts**. A non-converged result is explicitly marked. Equal boundary radii do not enforce tangency to a unit disk, and the boundary may be nonconvex.
- Maximum depth 7, 12,000 tiles and 40,000 vertices. Whole-mesh generation grows exponentially. Drawing thousands of SVG elements also has a browser cost.
- No hyperbolic packing or automated discovery is presented as implemented. The flat mesh, star triangulation, pure solver modules, worker boundary, and hierarchy provide extension points for both. See [architecture](docs/ARCHITECTURE.md) and [source research](docs/RESEARCH.md).

## Verification

`npm test` runs 48 tests covering worker request/response integration, structured errors, grammar errors, orientation and manifold checks, exact chair and grid counts, multi-vertex split reversal, incompatible edge subdivisions, parent hierarchy, mixed tile types, size limits, harmonic equations, analytic circle-radius ratios, developed tangency, and small-example non-overlap. A depth-four chair packing test exercises a larger patch. `npm run build` runs strict TypeScript checking and a production Vite build.

The initial build session blocked browser preview. In the subsequent update, the local server and in-app browser were available: the new classic examples and plain-language headings were checked in the running application. Automated tests cover numerical and combinatorial behavior; browser checks were manual.

Sources and attribution: [RESEARCH.md](docs/RESEARCH.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
