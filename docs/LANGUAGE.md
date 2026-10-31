# Escher Studio language v0.1

A new, deliberately small text interface to the prototile/subdivision model. No pre-existing Escher parser was available in the supplied KoebePy checkout; the user confirmed a new parser was required.

```text
tile Quad(A,B,C,D) {
  split A B -> a;
  split B C -> b;
  split C D -> c;
  split D A -> d;
  vertex o;
  child Quad(A,a,o,d);
  child Quad(a,B,b,o);
  child Quad(o,b,C,c);
  child Quad(d,o,c,D);
}
start Quad;
depth 3;
```

## Grammar

```ebnf
program = { tile | start | depth } ;
tile = "tile", name, "(", names, ")", "{", { statement }, "}" ;
statement = "split", name, name, "->", names, ";"
          | "vertex", names, ";"
          | "child", name, "(", names, ")", ";" ;
start = "start", name, ";" ;
depth = "depth", integer, ";" ;
names = name, { ",", name } ;
```

Names match `[A-Za-z_][A-Za-z_0-9]*` and are case sensitive. Keywords are contextual. Whitespace is ignored. `#` and `//` begin line comments. Semicolons terminate statements; tile blocks need no trailing semicolon. Forward references to tile types are supported. If omitted, `start` is the first tile and `depth` is 3. Duplicate start/depth declarations are errors. Depth 0 draws just the initial tile.

## Semantics

A prototile is an ordered cycle. In `child Quad(A,a,o,d)`, the four positions correspond to Quad's `(A,B,C,D)` in that order. Rotating a child cycle therefore changes the *correspondence* even when its underlying boundary is the same. All child cycles must agree with the parent's orientation. To rotate a tile combinatorially, choose the appropriate cyclic order. Reflections are not implicitly inferred.

`split A B -> a,b;` inserts `a`, then `b`, along the directed edge from A to B. Only consecutive parent vertices may be endpoints. An edge without a split declaration stays intact. Every new name is unique within the parent rule; neighboring parents may use different local names. The engine identifies their split vertices by shared edge and reverses the sequence when traversing the edge backwards. Both sides must request the same number of inserted vertices.

`vertex o,p;` creates interior vertices local to each parent tile. Every declared vertex must appear in a child cycle. Every tile type needs a subdivision rule, including types not reached from the chosen start.

The children must form exactly one oriented disk whose boundary is the parent's split boundary. Shared edges must occur in opposite directions. Vertex links must be paths at the boundary and cycles in the interior. Rule diagnostics point to the tile declaration; syntax diagnostics identify the offending token line. Validation is combinatorial, not a proof of a geometric or aperiodic tiling.

See `examples/` for complete scripts. The chair cycles are transcribed from Bowers' KoebePy tutorial and the supplied source examples; no chair coordinates are used to generate the drawing.
