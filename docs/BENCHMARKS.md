# Packing benchmarks

Measured locally on macOS with Node v23.9.0. One solve per case, after a small warm-up. These are indicative timings, not statistical or cross-device guarantees. Generation and packing are timed separately; browser rendering is excluded.

| Example | Depth | Tiles | Circles | Generate | Pack | Relative tangency error | Accepted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Chair | 5 | 1,024 | 4,225 | 13 ms | 0.38 s | 3.07e-09 | Yes |
| Chair | 6 | 4,096 | 16,641 | 39 ms | 2.72 s | 4.84e-08 | Yes |
| Pinwheel | 5 | 3,125 | 6,351 | 14 ms | 0.94 s | 2.40e-05 | No |
| Pinwheel | 6 | 15,625 | 31,501 | 58 ms | 10.62 s | 1.97e-03 | No |
| Quad | 6 | 4,096 | 8,321 | 17 ms | 0.55 s | 8.68e-09 | Yes |
| Quad | 7 | 16,384 | 33,025 | 81 ms | 4.37 s | 2.45e-08 | Yes |

Run `npm run benchmark:packing`. It bundles the TypeScript benchmark with the esbuild dependency already supplied by Vite and writes the new report to `work/packing-benchmark.json`. The checked-in JSON records this run.

The new budgets are depth 9, 50,000 tiles, 100,000 vertices, and 50,000 circles (including added face-center circles). The parser, generator, controls and diagnostics share these constants. Circle counts are checked before allocating the star triangulation.

Accuracy requirements remain maximum interior angle error < 1e-8 radians and maximum relative tangency error < 1e-6. The pinwheel cases above finish quickly but fail tangency acceptance. Raising the resource budget does not relabel them as converged.

Studio permits 90 seconds per request, with cancellation available. Discovery permits two minutes for a multi-solve experiment or search. JavaScript memory use, graph structure, numerical conditioning and SVG rendering may become limiting earlier on another device.
