# Discovery workspace

Open **Discovery** in the header. The script on the left remains the input to every tool. All computation stays in browser workers; no script or result is sent to GitHub or another server.

## Convergence experiments

1. Choose a seed subdivision depth. The app constructs that finite patch and computes face-adjacency distance from its exposed boundary.
2. Choose a target tile, either in the preview or by its ID. Automatic selection picks a tile furthest from the boundary. That same ancestor ID and its designated vertices are retained throughout the experiment.
3. Choose the surrounding collar: all seed tiles, or a specified number of face-neighbor rings. Bounded complementary holes are filled; a remaining non-manifold cut is rejected. The collar selects surroundings from the finite seed, not an infinite extension beyond it.
4. Choose additional refinements. Every tile of the chosen patch is subdivided, including the target's descendants and the surrounding tiles.
5. Compare equal fixed boundary radii with a deterministic smooth perturbation. For boundary vertex index i among B vertices, varied log-radius is `0.35 cos(4πi/B) + 0.2 sin(6πi/B)`. Only interior radii are solved. No known prototile coordinates are supplied.

The target's first two corresponding vertices are mapped to 0 and 1 by an orientation-preserving similarity. This fixes translation, scale, and rotation without hiding affine distortion. A boundary plot overlays the normalized aggregates; solid and dashed curves distinguish boundary conditions.

Measurements:

- **Margin:** minimum number of leaf-tile adjacency steps from a target descendant to the exposed patch boundary. Zero means the target touches that boundary.
- **Side deviation:** maximum distance of an aggregate side's vertices from the segment joining its designated corners, in units of the first designated edge's chord. A side here is a combinatorial prototile edge, which may be part of a longer straight geometric side.
- **Previous / Two steps:** sampled symmetric boundary-distance estimates against the previous refinement and the refinement two steps earlier. The second comparison helps distinguish odd/even subsequences. Each estimate samples 160 points on each source polyline and measures distance to the segments of the other polyline. It is not a certified Hausdorff bound.
- **Boundary change:** the same distance estimate between equal and varied boundary radii at the same refinement.
- **Corner angles:** polygonal angles between chords joining designated corners, including reflex angles. They are not local angles of the jagged leaf boundary.
- **Side chords / arclengths:** endpoint distance and refined polygonal boundary length for each designated side, with the same normalization.

A row is accepted for comparisons only when the packer's maximum angle error is below 1e-8 radians and its maximum relative tangency error is below 1e-6. Non-converged or over-limit rows remain visible with their reason. This does not certify global non-overlap. A full run may include both accepted rows and excluded rows.

To investigate the pinwheel, first compare a root target (seed depth 0) at odd and even refinements. Then use an interior target in a seed of depth 2 or 3 and vary its collar. Do not interpret a finite exposed root boundary as the whole-plane shape-convergence theorem's setting.

## Geometric fitting

This is an actual coordinate solver, separate from packing. It does not read the geometric fixtures used in tests.

Let M count children of each type in each parent. If all children have the same linear contraction r, positive tile areas must satisfy `M A = A/r²`. The solver estimates the Perron growth ρ by iteration on `I + M` and proposes `r = 1/sqrt(ρ)`. Rules with no contraction are rejected. This model intentionally restricts the search to a common contraction.

Unknowns are all local rule-vertex coordinates and a similarity for each child. The solver alternates:

1. For fixed coordinates, fit an orientation-preserving child rotation and translation at scale r by planar Procrustes fitting.
2. For fixed similarities, solve sparse least-squares coordinate equations. Translation and rotation gauges are fixed for each prototile, and the starting prototile's first edge has unit length.
3. Project split vertices onto ordered parameters along parent edges and include those straight-edge equations in the next coordinate solve.

Initialization comes from computed depth-two drawings. Additional deterministic attempts perturb those coordinates. No example name or known coordinates enter the fitter. Maximum settings: four attempts, 1,200 iterations each, 320 local vertices and 180 children. A two-minute worker timeout bounds a run.

A numerical candidate passes when RMS equation residual is below 1e-5 and maximum component residual below 1e-4, with positive polygon areas, matching total child area, no collapsed subdivision edges, and no detected crossings or unintended contacts. Intersection and area checks have finite tolerances. Exported JSON contains prototile and local vertex coordinates, child cycles, and child complex similarity coefficients `a,b` in `z -> a*z+b`.

A successful numerical fit is useful evidence and an initial condition for exact algebraic reconstruction. It is not a proof. A failed or local-minimum fit does not establish non-realizability or fractality. The regression suite recovers square, pinwheel, and sphinx realizations numerically; manual checks also cover chair and domino.

## Rule search

Search varies one child at a time:

- Cyclically rotate its correspondence to the child's prototile vertices while preserving the oriented face cycle.
- Substitute another declared child type with the same number of vertices.

A seeded shuffle makes trial selection reproducible. Each trial passes local disk validation and three recursive subdivision levels, then receives a short, 160-iteration geometric fit. The original rule receives the same short fit as a baseline. Candidates are ranked by geometry-check status and residual. Rejection reasons are retained. The search never overwrites the editor until you choose **Open candidate**.

This is a bounded local search, not exhaustive rule enumeration. It does not test novelty, prove compatibility at all depths, identify tiling spaces, or establish aperiodicity. Rotationally symmetric rules can yield equivalent candidates. Promising results should receive longer fitting, larger-patch experiments, and exact verification.

## Structure and boundary diagnostics

The substitution matrix and its estimated growth are displayed with descendant edge counts along each original boundary edge. For equal boundary circles every boundary-center edge has length twice the common radius, so these counts determine polygonal arclength ratios. Pinwheel's alternating edge counts are reproduced directly from its combinatorics.

## Notebook and exports

- **CSV:** one row per boundary condition and refinement, including numerical and geometric measurements.
- **Experiment JSON:** exact input source, parameters, normalized boundary coordinates, measurements, timestamp, and engine version.
- **Geometry JSON:** coordinates, fitted child similarities, residuals, and geometry-check results.
- **Search JSON:** starting rule, baseline, seed, trial counts, candidates and rejection reasons.
- **Notebook:** up to 20 source/settings entries in browser localStorage, exportable as JSON. Import accepts exported notebooks or convergence experiments and validates their sources and settings. Imported numerical outputs are not treated as verified. Restore and rerun to reproduce them.

A notebook stores configurations, not executable code or remote jobs. Export files for durable records; browser storage can be cleared or filled. Changing the script cancels active discovery work and clears transient results. Save or export a run before changing its source.
