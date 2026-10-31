import { describe,it,expect } from 'vitest';
import { parse } from '../src/engine/parser';
import { generate,initial } from '../src/engine/subdivide';
import { makeMesh } from '../src/engine/topology';
import { tutte } from '../src/engine/tutte';
import { pack } from '../src/engine/packing';
import { examples } from '../src/examples';
const chair=parse(examples[0].source),quad=parse(examples[1].source),tri=parse(examples[2].source);
describe('language and oriented disk validation',()=>{
  it('accepts examples, comments and named cycles',()=>{for(const e of examples)expect(Object.keys(parse(e.source).rules).length).toBeGreaterThan(0);});
  it.each([
    ['unknown command','frobnicate;',/Unknown command/],
    ['bad character','@',/Unexpected character/],
    ['undefined tile',examples[1].source.replace('child Quad(A','child Missing(A'),/Unknown child/],
    ['duplicate name',examples[1].source.replace('vertex o;','vertex o,A;'),/distinct/],
    ['reversed edge',examples[1].source.replace('split A B','split B A'),/directed/],
    ['wrong arity',examples[1].source.replace('Quad(A,a,o,d)','Quad(A,a,o)'),/needs 4/],
    ['wrong orientation',examples[1].source.replace('Quad(A,a,o,d)','Quad(A,d,o,a)'),/same direction|orientation/],
    ['unused vertex',examples[1].source.replace('vertex o;','vertex o,unused;'),/Every declared/],
    ['depth limit',examples[1].source.replace('depth 4','depth 8'),/between 0 and 7/],
    ['missing semicolon',examples[1].source.replace('vertex o;','vertex o'),/Expected ;/],
    ['prototype pollution','tile __proto__(A,B,C) { child __proto__(A,B,C); } start __proto__;',null]
  ])('%s',(_name,source,pattern)=>{if(pattern)expect(()=>parse(source)).toThrow(pattern);else expect(parse(source).start).toBe('__proto__');});
  it('reports source line',()=>{try{parse('# comment\nwhat;');throw new Error('accepted');}catch(e){expect((e as {line:number}).line).toBe(2);}});
  it('rejects disconnected disks',()=>expect(()=>makeMesh(6,[{id:'a',type:'T',parent:null,path:[],vertices:[0,1,2]},{id:'b',type:'T',parent:null,path:[],vertices:[3,4,5]}])).toThrow(/Multiple boundary/));
});
describe('recursive subdivision and hierarchy',()=>{
  it('matches KoebePy published chair depth-three counts',()=>{const m=generate(chair,3).levels[3];expect([m.vertexCount,m.edges.length,m.tiles.length]).toEqual([225,288,64]);expect(m.boundary.length).toBe(64);});
  it.each([0,1,2,3,4])('identifies shared quad vertices at depth %i',d=>{const m=generate(quad,d).levels[d],n=2**d;expect(m.vertexCount).toBe((n+1)**2);expect(m.tiles.length).toBe(n*n);expect(m.edges.length).toBe(2*n*(n+1));expect(m.boundary.length).toBe(4*n);});
  it('preserves positional correspondence and parent links',()=>{const levels=generate(chair,3).levels;for(let d=1;d<levels.length;d++)for(const t of levels[d].tiles){expect(levels[d-1].tiles.some(p=>p.id===t.parent)).toBe(true);expect(t.path.length).toBe(d);expect(t.vertices.length).toBe(8);}});
  it('supports mutually recursive types',()=>{const m=generate(parse(examples[3].source),3).levels[3];expect(new Set(m.tiles.map(t=>t.type))).toEqual(new Set(['Amber','Teal']));});
  it('reverses ordered sequences of multiple split vertices',()=>{
    // 3x3 subdivision: every parent edge has TWO inserted vertices.
    const source=`tile Grid(A,B,C,D) { split A B -> a,b; split B C -> c,d; split C D -> e,f; split D A -> g,h; vertex i,j,k,l;
      child Grid(A,a,i,h); child Grid(a,b,j,i); child Grid(b,B,c,j);
      child Grid(h,i,k,g); child Grid(i,j,l,k); child Grid(j,c,d,l);
      child Grid(g,k,f,D); child Grid(k,l,e,f); child Grid(l,d,C,e); } start Grid; depth 2;`;
    const m=generate(parse(source),2).levels[2];expect([m.vertexCount,m.tiles.length,m.boundary.length]).toEqual([100,81,36]);
  });
  it('fails incompatible adjacent edge split counts',()=>{
    const p=parse(`tile T(A,B,C) { split A B -> a; child T(A,a,C); child T(C,a,B); } depth 2;`);
    expect(generate(p,1).levels[1].tiles.length).toBe(2);
    expect(()=>generate(p,2)).toThrow(/Incompatible edge splits/);
  });
  it('enforces bounded work',()=>expect(()=>generate(chair,7)).toThrow(/Size limit/));
});
describe('Tutte harmonic embedding',()=>{
  it.each([chair,quad,tri])('satisfies barycenter equations and convex boundary',p=>{const m=generate(p,3).levels[3],d=tutte(m);expect(d.converged).toBe(true);expect(d.residual).toBeLessThan(1e-9);for(const v of m.boundary)expect(Math.hypot(...d.points[v])).toBeCloseTo(1,12);for(const t of m.tiles){const area=t.vertices.reduce((s,v,i)=>{const [x,y]=d.points[v],[a,b]=d.points[t.vertices[(i+1)%t.vertices.length]];return s+x*b-y*a;},0);expect(area).toBeGreaterThan(0);}});
});
describe('Euclidean circle packing',()=>{
  it.each([[quad,Math.SQRT2-1],[tri,2/Math.sqrt(3)-1]] as const)('matches analytic regular polygon star', (p,ratio)=>{const m=initial(p),d=pack(m);expect(d.converged).toBe(true);expect(d.radii![m.vertexCount]/d.radii![0]).toBeCloseTo(ratio,8);expect(d.tangency!).toBeLessThan(1e-8);});
  it.each([chair,quad,tri])('closes developed triangulation and tangent edges',p=>{const m=generate(p,2).levels[2],d=pack(m);expect(d.converged).toBe(true);expect(d.residual).toBeLessThan(1e-8);expect(d.tangency!).toBeLessThan(1e-6);expect(d.points.every(p=>p.every(Number.isFinite))).toBe(true);
    // Certify non-overlap for these small regression examples, including non-neighbors.
    for(let i=0;i<d.points.length;i++)for(let j=0;j<i;j++)expect(Math.hypot(d.points[i][0]-d.points[j][0],d.points[i][1]-d.points[j][1])-(d.radii![i]+d.radii![j])).toBeGreaterThan(-1e-6);
  });
});
