# Source research and implementation decisions

## Sources actually inspected

1. Bowers & Lawson, **Escher: An Engine for Exploring Hierarchical Combinatorial Tilings**, Bridges 2024, pp. 455–458. [Paper](https://archive.bridgesmathart.org/2024/bridges2024-455.pdf). The model is named prototile cycles, directed edge splits, interior vertices and child cycles, with hierarchy retained. The paper distinguishes Tutte drawing from star-triangulated hyperbolic disk packing. This app implements the former and an explicitly different Euclidean packing option.
2. User-supplied **KoebePy**, `/Users/bowersjc/Documents/koebepy`, repository HEAD `4497761b6234cc4ebc0253e561ac8e1e58014585` (working files may have local modifications). Inspected `koebe/algorithms/tiling.py`, `tutteEmbeddings.py`, `hypPacker.py`, `circlepackings/gopack.py`, and `circlepackings/newton_packing.py`. [Upstream](https://github.com/johncbowers/koebepy).
3. Bowers' [KoebePy chair tutorial](https://theobtusegeometer.com/2020/04/08/tilings-from-finite-subdivision-rules-in-koebepy/). Its four ordered child cycles and depth-three count (225 vertices, 288 edges, 64 tiles) serve as a regression oracle. This app calls the initial tile depth 0 and each pass increments depth by one; the tutorial calls the initial tile level 1.
4. Local **GOPack MATLAB** checkout, `/Users/bowersjc/Documents/git/GOPack`, HEAD `d69562a4189f2caaa5b095cdc48dba7931fada81`. Inspected README and `code/@GOPacker/{riffle,continueRiffle,layoutCenters,setEffective}.m`. [Upstream](https://github.com/kensmath/GOPack). It alternates radius-dependent Tutte-style center solves with sector-area effective-radius updates. The MATLAB source is GPL-3.0; none is copied into this app.
5. Gerald Lee Orick Jr., **Computational Circle Packing: Geometry and Discrete Analytic Function Theory**, University of Tennessee PhD thesis, May 2010. The primary-source [thesis PDF](https://trace.tennessee.edu/server/api/core/bitstreams/3e246010-0508-4a12-aa14-066e2969a38c/content) was located, but the browser retrieval rejected its 14.6 MB response. The full thesis was **not read** in this session. No claim of a thesis-verified Orick port is made.

## Findings

The local `gopack.py` explicitly describes itself as a MATLAB port, but `layoutCenters` and `setEffective` are `pass`. Its boundary code also shadows `abs` with a list before calling `abs(...)`. Treat it as a sketch, not a working numerical baseline.

`hypPacker.py` contains substantial Thurston-style hyperbolic angle-sum repacking and layout machinery, credited to CirclePack. `newton_packing.py` implements a distinct Euclidean fixed-boundary log-radius Newton method and oriented BFS layout, with a thesis citation. These methods should not be conflated merely because they share a citation or use circle radii.

For the initial browser implementation we independently express the Euclidean angle equations and sparse Laplacian Newton system in TypeScript, with behavior guided by `newton_packing.py`. We retain a monotonic line search and explicitly measure developed tangency error, rather than accepting an unsuccessful full step or silently treating angle convergence as a complete geometric certificate. We do not transplant the incomplete Python GoPack routine.

No historical Escher text grammar was found in the supplied source; the user confirmed that a new parser was needed. The language is a documented frontend to the original combinatorial model, not a claimed compatible implementation of an existing syntax.

## Requirements left open

A verified maximal hyperbolic packing or complete Orick/GOPack port requires further source study, including the full thesis, independent cross-language fixtures, boundary normalization tests, and a licensing decision if MATLAB code is translated. It is not hidden behind a disabled or misleading UI option. Automated tiling discovery is future work; current inspection provides hierarchy and basic graph counts only.

## Classic examples added from the supplied papers

Read Bowers & Stephenson, *Conformal Tilings I: Foundations, Theory, and Practice*, especially §3.4 (Examples 3.7–3.9), Figure 15 (domino) and Figure 17 (sphinx and pinwheel), in the [FSU preprint](https://www.math.fsu.edu/e-prints/archive/paper480.pdf). The classic scripts are direct combinatorial transcriptions of those figures:

- **Domino:** four children, one six-vertex type; both long-side midpoints are included. The two upper children are vertical and the lower two horizontal, as in Figure 15.
- **Sphinx:** four children, two reflected six-vertex types. The base vertex is directly below the principal corner, as described in Example 3.8; putting it at the nearby triple junction would break later subdivisions.
- **Pinwheel:** five children, two reflected four-vertex types. The longer-leg midpoint makes each geometric triangle a combinatorial quadrilateral. The hypotenuse is split into five edges.

All child cycles begin at the marked principal corner and preserve the positional correspondence for their own handedness. Reflection is represented by a separate type with a reversed vertex order, not by silently reversing a tile during generation. Tests verify both handed starting types through repeated subdivision. Independent Euclidean coordinate fixtures verify each child's similarity, scale (1/2 for sphinx and domino, 1/√5 for pinwheel), and vertex correspondence. These fixture coordinates are confined to tests and never influence the embeddings.

The second supplied link is Bowers & Stephenson, *Conformal Tilings II: Local Isomorphism, Hierarchy, and Conformal Type*. AMS denied direct retrieval; the [authors' FSU preprint](https://www.math.fsu.edu/~aluffi/archive/paper481.pdf) was retrieved instead. Its introduction and hierarchy discussion distinguish combinatorial hierarchy from conformal hierarchy, with symmetry/expansion hypotheses in the type results. We do not claim those infinite-tiling theorems certify the app's finite Euclidean fixed-boundary packings. This paper is distinct from the Kenyon–Stephenson shape-convergence paper cited above.
