# Architecture

`src/engine` contains pure TypeScript modules, independent of React and browser APIs except `worker.ts`.

| Module | Responsibility |
| --- | --- |
| types | Rule AST, oriented tile cycles, level meshes, hierarchy paths, drawing diagnostics |
| parser | Tokenization with line numbers, syntax parsing, complete local rule validation |
| topology | Edge incidences, one boundary cycle, Euler characteristic, vertex links |
| subdivide | Shared edge split cache per pass, local vertex maps, hierarchy, work limits |
| linear | Sparse Jacobi-preconditioned conjugate gradient |
| tutte | Dirichlet harmonic embedding and measured residual |
| packing | Star triangulation, Euclidean Newton solver, oriented triangle development |
| worker | Isolated parse/generate/embed request with structured error response |
| discovery | Collar selection, aggregate boundaries, normalization, shape metrics, experiments, substitution diagnostics |
| geometry | Alternating similarity/coordinate least squares and numerical geometric checks |
| search | Deterministic rule variations, recursive validation, short-fit ranking |
| discovery-worker | Progress, errors, and results for discovery tasks |

The graph is represented by indexed polygonal cycles and derived undirected edges, rather than the original Python DCEL classes. Incidences and links are reconstructed for validation. Vertex IDs persist across levels; tile IDs extend a parent ID by a child index. A hierarchy path is the sequence of child indices from the root. The UI retains all generated levels, colors leaves by path prefixes, and outlines edges whose incident leaves have different prefixes.

The UI sends source, depth, embedding choice and optional rule type to a module worker. A new request terminates the previous worker. Export serializes the SVG, including the current pan/zoom and selection state. Draft scripts persist locally. No computations or user scripts are sent to a server.

## Numerical design

Tutte solves the symmetric interior graph Laplacian directly as an operator with a sparse adjacency list. There is no matrix inversion. Coordinates on the boundary are equally spaced on the unit circle.

The packing solver uses `u_i = log r_i`. For tangent circles with radii `r_i,r_j,r_k`, angle at i is computed stably as `2 atan sqrt(r_j r_k / (r_i (r_i+r_j+r_k)))`. Interior target is `2π`. An edge ij gets per-triangle conductance `sqrt(r_i r_j r_k / (r_i+r_j+r_k)) / (r_i+r_j)`; these assemble the negative angle Jacobian as a positive Dirichlet Laplacian. Newton steps solve this system, then backtrack until the squared angle residual decreases. The implementation stops instead of accepting an unsuccessful line search. Triangle development always puts the third point to the left of its directed edge.

Boundary radii are fixed equal, not boundary centers. Solved circles are developed in the Euclidean plane, then uniformly scaled/translated for viewing. Residual is maximum interior angle error; tangency is maximum relative edge-length error over *all* triangulation edges, including closure edges not used to place a new point. These two checks do not certify absence of nonadjacent overlap.

## Extension points

A hyperbolic solver can accept the same star triangles and boundary cycle, return Euclidean Poincare circles for drawing, and add diagnostics to `Drawing`. It must distinguish hyperbolic centers from Euclidean circle centers and handle horocycles explicitly. Do not reuse equal-fixed-radii Euclidean output under a hyperbolic label.

A full Orick/GOPack port needs effective-sector radii, radius-dependent weighted center layouts, boundary-circle normalization, alternating iterations and independently checked error criteria. The local Python `gopack.py` does not provide those completed routines. GOPack MATLAB is GPL-3.0: choose licensing deliberately before translating it.

The discovery workspace now operates on the pure AST and incidence data. It supports finite collars and interior targets, normalized shape comparisons, common-contraction geometry fitting, and reproducible local rule search. Detailed algorithms and limits are in [DISCOVERY.md](DISCOVERY.md). Full collared tile enumeration, expansion complexes, and exact certificates remain future work. A finite patch alone cannot prove aperiodicity or exhaust an infinite tiling's collared tiles.
