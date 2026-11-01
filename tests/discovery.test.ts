import {describe,it,expect} from 'vitest';
import {examples} from '../src/examples';
import {parse} from '../src/engine/parser';
import {generate} from '../src/engine/subdivide';
import {pack} from '../src/engine/packing';
import {aggregateBoundary,normalize,prepareExperiment,runExperiment,shapeDistance,signedArea,structure,serialize} from '../src/engine/discovery';
import {fitGeometry,geometryChecks} from '../src/engine/geometry';
import {searchRules} from '../src/engine/search';
const example=(name:string)=>examples.find(e=>e.name===name)!;
const quad=parse(example('Quad').source);
const config={seedDepth:2,target:'auto',collar:-1,refinements:2,boundaries:['equal','wave'] as ('equal'|'wave')[]};
describe('discovery combinatorics',()=>{
 it('reports exact classical area growth and pinwheel boundary parity',()=>{
  const info=structure(parse(example('Pinwheel').source));expect(info.growth).toBeCloseTo(5,10);expect(info.contraction).toBeCloseTo(1/Math.sqrt(5),10);
  expect(info.boundaryCounts.map(r=>r.counts)).toEqual([[1,1,1,1],[1,5,1,1],[5,5,5,5],[5,25,5,5],[25,25,25,25]]);
 });
 it('selects an interior ancestor independently of collar size',()=>{
  const full=prepareExperiment(quad,config),cropped=prepareExperiment(quad,{...config,collar:1});
  expect(full.target.id).toBe(cropped.target.id);expect(full.margin[full.seed.tiles.indexOf(full.target)]).toBeGreaterThan(0);
  expect(cropped.patch.tiles.length).toBeLessThan(full.patch.tiles.length);expect(cropped.patch.vertexCount-cropped.patch.edges.length+cropped.patch.tiles.length).toBe(1);
 });
 it('isolates a target with collar zero and preserves designated vertices',()=>{
  const prepared=prepareExperiment(quad,{...config,collar:0});expect(prepared.patch.tiles.length).toBe(1);expect(prepared.compactTarget.vertices).toHaveLength(4);
 });
 it('extracts the boundary of a deep aggregate from leaves',()=>{
  const levels=generate(quad,3).levels,target=levels[1].tiles[0],cycle=aggregateBoundary(levels[3],target.id);
  expect(cycle.length).toBe(16);for(const v of target.vertices)expect(cycle).toContain(v);
 });
 it('round trips the full language including reflected types',()=>{for(const e of examples){const p=parse(e.source);const q=parse(serialize(p));expect(q.start).toBe(p.start);expect(q.depth).toBe(p.depth);expect(Object.values(q.rules).map(({line,...r})=>r)).toEqual(Object.values(p.rules).map(({line,...r})=>r));}});
 it('rejects invalid experiment parameters',()=>{expect(()=>prepareExperiment(quad,{...config,seedDepth:9})).toThrow();expect(()=>prepareExperiment(quad,{...config,target:'missing'})).toThrow();expect(()=>prepareExperiment(quad,{...config,boundaries:[]})).toThrow();});
});
describe('shape measurements',()=>{
 it('removes similarities while retaining affine distortion',()=>{
  const shape:[[number,number],[number,number],[number,number]]=[[0,0],[1,0],[0,1]],changed=shape.map(([x,y])=>[3-2*y,4+2*x] as [number,number]);
  expect(normalize(changed,changed[0],changed[1])).toEqual(shape);expect(normalize([[0,0],[1,0],[0,2]],[0,0],[1,0])[2][1]).toBe(2);
 });
 it('measures polygonal boundary distance and area',()=>{
  const a:[number,number][]=[[0,0],[1,0],[1,1],[0,1]],b:[number,number][]=[[0,0],[1,0],[1,2],[0,2]];
  expect(shapeDistance(a,a)).toBe(0);expect(shapeDistance(a,b)).toBeCloseTo(1,6);expect(signedArea(a)).toBe(1);
 });
 it('runs two boundary conditions with finite, independently aligned metrics',()=>{
  const result=runExperiment(quad,example('Quad').source,config);expect(result.rows).toHaveLength(6);
  expect(result.rows.every(r=>r.accepted&&r.margin>0&&r.shape!.angles.every(Number.isFinite))).toBe(true);
  expect(result.rows.filter(r=>r.depth===2).every(r=>r.parityDelta!==undefined)).toBe(true);
  expect(result.rows[0].shape!.angles.every(a=>a>0&&a<360)).toBe(true);
  expect(result.rows[0].shape!.corners[0]).toEqual([0,0]);expect(result.rows[0].shape!.corners[1][0]).toBeCloseTo(1,12);
 });
 it('makes the fixed-radius perturbation reproducible and nontrivial',()=>{
  const mesh=generate(quad,2).levels[2],a=pack(mesh),b=pack(mesh,{boundary:'wave'}),c=pack(mesh,{boundary:'wave'});
  expect(b.points).toEqual(c.points);expect(b.points).not.toEqual(a.points);expect(b.converged).toBe(true);
 });
 it('keeps target identity fixed across all refinements',()=>{
  const run=runExperiment(quad,example('Quad').source,{...config,collar:0});expect(run.rows.every(r=>r.margin===0)).toBe(true);expect(run.target).toBe(prepareExperiment(quad,config).target.id);
 });
});
describe('geometric discovery',()=>{
 it('fits an exact square rule without stored example coordinates',()=>{
  const fit=fitGeometry(quad,{iterations:100,attempts:1});expect(fit.passed).toBe(true);expect(fit.residual).toBeLessThan(1e-8);expect(fit.contraction).toBe(.5);
 });
 it('recovers the pinwheel right angle and leg ratio from combinatorics',()=>{
  const fit=fitGeometry(parse(example('Pinwheel').source),{iterations:1000,attempts:2});expect(fit.passed).toBe(true);
  const {A,B,C}=fit.tiles[0].points,ab=Math.hypot(B[0]-A[0],B[1]-A[1]),ac=Math.hypot(C[0]-A[0],C[1]-A[1]);
  expect(ac/ab).toBeCloseTo(2,2);expect((B[0]-A[0])*(C[0]-A[0])+(B[1]-A[1])*(C[1]-A[1])).toBeCloseTo(0,2);
 });
 it('does not label a truncated fit as a geometric realization',()=>{
  const fit=fitGeometry(parse(example('Chair').source),{iterations:1,attempts:1});expect(fit.passed).toBe(false);expect(fit.issues.length).toBeGreaterThan(0);
 });
 it('rejects collapsed or crossing candidate geometry',()=>{
  const tile={name:'Crossed',vertices:['A','B','C','D'],points:{A:[0,0],B:[1,1],C:[0,1],D:[1,0]} as Record<string,[number,number]>,children:[{type:'Crossed',vertices:['A','B','C','D']}]};expect(geometryChecks(tile).length).toBeGreaterThan(0);
 });
 it('rejects identity rules with no contraction',()=>expect(()=>fitGeometry(parse('tile T(A,B,C) { child T(A,B,C); }'))).toThrow(/growth/));
 it('performs a reproducible search and returns parseable candidates',()=>{
  const a=searchRules(quad,{seed:17,trials:3}),b=searchRules(quad,{seed:17,trials:3});expect(a).toEqual(b);expect(a.candidates.length).toBeGreaterThan(0);
  for(const c of a.candidates)expect(generate(parse(c.source),3).levels[3].tiles.length).toBe(64);
 });
});

it('fits the two reflected sphinx types with straight, ordered edges',()=>{
 const fit=fitGeometry(parse(example('Sphinx').source),{iterations:1200,attempts:2});
 expect(fit.passed).toBe(true);expect(fit.maxResidual).toBeLessThan(1e-4);
 expect(fit.tiles.every(t=>t.similarities?.length===4)).toBe(true);
});
it('measures boundary-condition sensitivity separately from depth change',()=>{
 const result=runExperiment(quad,example('Quad').source,{...config,refinements:0});
 expect(result.rows[0].boundarySensitivity).toBeGreaterThan(0);
 expect(result.rows[0].boundarySensitivity).toBe(result.rows[1].boundarySensitivity);
 expect(result.rows[0].delta).toBeUndefined();
});
it('reports resource limits as excluded rows instead of losing a run',()=>{
 const p=parse(example('Quad').source),result=runExperiment(p,'',{...config,seedDepth:4,refinements:4,boundaries:['equal']});
 expect(result.rows.some(r=>!r.accepted&&r.error?.includes('Size limit reached'))).toBe(true);
 expect(result.rows[0].accepted).toBe(true);
});
