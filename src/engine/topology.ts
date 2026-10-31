import { EscherError, type Mesh, type Tile } from './types';
export const edgeKey = (a: number, b: number) => a < b ? `${a}:${b}` : `${b}:${a}`;
/** Validates an oriented polygonal cell decomposition of a single disk. */
export function makeMesh(vertexCount: number, tiles: Tile[]): Mesh {
  const directed = new Set<string>();
  const edges = new Map<string, [number, number][]>();
  const links = Array.from({length: vertexCount}, () => new Map<number, number[]>());
  const used = new Set<number>();
  const connect = (v: number, a: number, b: number) => {
    if (!links[v].has(a)) links[v].set(a, []);
    links[v].get(a)!.push(b);
  };
  for (const tile of tiles) {
    const vs = tile.vertices;
    if (vs.length < 3 || new Set(vs).size !== vs.length) throw new EscherError(`Tile ${tile.id} must have a simple cycle of at least three distinct vertices.`);
    for (let i=0;i<vs.length;i++) {
      const a=vs[i], b=vs[(i+1)%vs.length], c=vs[(i+vs.length-1)%vs.length];
      if (!Number.isInteger(a) || a<0 || a>=vertexCount) throw new EscherError('Invalid vertex index.');
      used.add(a);
      const d=`${a}>${b}`;
      if (directed.has(d)) throw new EscherError(`Edge ${a} → ${b} occurs twice in the same direction. Check child orientations.`);
      directed.add(d);
      const key=edgeKey(a,b); const list=edges.get(key) ?? [];
      list.push([a,b]); edges.set(key,list);
      if (list.length>2) throw new EscherError('More than two tiles meet along an edge.');
      connect(a,b,c); connect(a,c,b);
    }
  }
  if (used.size !== vertexCount) throw new EscherError('Every declared vertex must occur in a child tile.');
  const boundaryEdges=[...edges.values()].filter(e=>e.length===1).map(e=>e[0]);
  const next=new Map<number,number>(); const incoming=new Set<number>();
  for (const [a,b] of boundaryEdges) {
    if (next.has(a) || incoming.has(b)) throw new EscherError('Boundary branches or touches itself at a vertex.');
    next.set(a,b); incoming.add(b);
  }
  if (next.size<3) throw new EscherError('The subdivision must have one nonempty disk boundary.');
  const boundary: number[]=[], boundarySeen=new Set<number>(); let v=boundaryEdges[0][0];
  while (!boundarySeen.has(v)) { boundarySeen.add(v); boundary.push(v); const n=next.get(v); if(n===undefined) throw new EscherError('Open boundary.'); v=n; }
  if (v!==boundary[0] || boundary.length!==boundaryEdges.length) throw new EscherError('Multiple boundary components or disconnected tiles.');
  if (vertexCount-edges.size+tiles.length!==1) throw new EscherError('Euler characteristic is not 1; the subdivision is not a disk.');
  // Each vertex link must be a connected path (boundary) or cycle (interior).
  const boundarySet=new Set(boundary);
  for (let i=0;i<vertexCount;i++) {
    const link=links[i], seen=new Set<number>(), queue=[link.keys().next().value as number];
    for(let h=0;h<queue.length;h++) { const u=queue[h]; if(seen.has(u))continue; seen.add(u); queue.push(...link.get(u)!); }
    const degrees=[...link.values()].map(n=>n.length);
    const ends=degrees.filter(d=>d===1).length;
    if(seen.size!==link.size || degrees.some(d=>d<1 || d>2) || ends!==(boundarySet.has(i)?2:0)) throw new EscherError(`Non-manifold link at vertex ${i}.`);
  }
  return {vertexCount,tiles,boundary,edges:[...edges.values()].map(e=>e[0])};
}
