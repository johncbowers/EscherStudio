export const examples = [
{ name:'Chair', subtitle:'Four chairs, one octagonal prototile', source:`# Combinatorial chair, after Bowers / KoebePy.
# Cycles map positionally to the named prototile.
tile Chair(A,B,C,D,E,F,G,H) {
  split A B -> a;
  split B C -> b;
  split C D -> c;
  split D E -> d;
  split E F -> e;
  split F G -> f;
  split G H -> g;
  split H A -> h;
  vertex i,j,k,l,m;
  child Chair(A,a,B,j,k,l,H,h);
  child Chair(G,g,H,l,m,e,F,f);
  child Chair(k,j,i,d,E,e,m,l);
  child Chair(C,c,D,d,i,j,B,b);
}
start Chair;
depth 3;` },
{ name:'Quad', subtitle:'A square split into four squares', source:`tile Quad(A,B,C,D) {
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
depth 4;` },
{ name:'Triangle', subtitle:'Midpoint subdivision into four triangles', source:`tile Triangle(A,B,C) {
  split A B -> a;
  split B C -> b;
  split C A -> c;
  child Triangle(A,a,c);
  child Triangle(a,B,b);
  child Triangle(c,b,C);
  child Triangle(a,b,c);
}
start Triangle;
depth 4;` },
{ name:'Two species', subtitle:'Mutually recursive tile types', source:`tile Amber(A,B,C,D) {
  split A B -> a;
  split B C -> b;
  split C D -> c;
  split D A -> d;
  vertex o;
  child Amber(A,a,o,d);
  child Teal(a,B,b,o);
  child Amber(o,b,C,c);
  child Teal(d,o,c,D);
}
tile Teal(A,B,C,D) {
  split A B -> a;
  split B C -> b;
  split C D -> c;
  split D A -> d;
  vertex o;
  child Teal(A,a,o,d);
  child Amber(a,B,b,o);
  child Teal(o,b,C,c);
  child Amber(d,o,c,D);
}
start Amber;
depth 3;` }
,
{"name": "Sphinx", "subtitle": "Four subtiles; two reflected six-vertex types", "source": "# Bowers & Stephenson, Conformal Tilings I, Figure 17.\n# The base vertex is below the principal corner, not the triple junction.\ntile Sphinx(A,B,C,D,E,F) {\n  split D E -> a,b;\n  split F A -> c,d;\n  vertex i,j,k,l;\n  child Sphinx(B,i,j,c,d,A);\n  child SphinxMirror(i,b,E,F,c,j);\n  child SphinxMirror(b,i,B,C,l,k);\n  child SphinxMirror(C,D,a,b,k,l);\n}\ntile SphinxMirror(A,F,E,D,C,B) {\n  split E D -> b,a;\n  split A F -> d,c;\n  vertex i,j,k,l;\n  child SphinxMirror(B,A,d,c,j,i);\n  child Sphinx(i,j,c,F,E,b);\n  child Sphinx(b,k,l,C,B,i);\n  child Sphinx(C,l,k,b,a,D);\n}\nstart Sphinx;\ndepth 3;"},
{"name": "Pinwheel", "subtitle": "Five subtiles; two reflected four-vertex types", "source": "# Bowers & Stephenson, Conformal Tilings I, Figure 17.\n# Each triangle includes the midpoint of its longer leg.\ntile Pinwheel(A,B,C,D) {\n  split B C -> f,g,h,i;\n  vertex j,k;\n  child PinwheelMirror(h,i,C,D);\n  child Pinwheel(h,D,f,g);\n  child Pinwheel(j,f,D,k);\n  child PinwheelMirror(j,k,D,A);\n  child PinwheelMirror(f,j,A,B);\n}\ntile PinwheelMirror(A,D,C,B) {\n  split C B -> i,h,g,f;\n  vertex j,k;\n  child Pinwheel(h,D,C,i);\n  child PinwheelMirror(h,g,f,D);\n  child PinwheelMirror(j,k,D,f);\n  child Pinwheel(j,A,D,k);\n  child Pinwheel(f,B,A,j);\n}\nstart Pinwheel;\ndepth 3;"},
{"name": "Domino", "subtitle": "Four subtiles of a six-vertex rectangle", "source": "# Bowers & Stephenson, Conformal Tilings I, Figure 15.\n# Both long sides include their midpoint.\ntile Domino(A,B,C,D,E,F) {\n  split A B -> a;\n  split B C -> b;\n  split C D -> c;\n  split D E -> d;\n  split E F -> e;\n  split F A -> f;\n  vertex o,p,q;\n  child Domino(f,o,p,E,e,F);\n  child Domino(A,a,B,p,o,f);\n  child Domino(E,p,B,b,q,d);\n  child Domino(d,q,b,C,c,D);\n}\nstart Domino;\ndepth 3;"}
];
