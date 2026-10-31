import { type Program, type Mesh, type Tile, type Tiling, EscherError } from './types';
import { edgeKey, makeMesh } from './topology';
export const MAX_TILES=12000;
export function initial(p: Program, type=p.start): Mesh {
  return makeMesh(p.rules[type].vertices.length,[{id:'0',type,vertices:p.rules[type].vertices.map((_,i)=>i),parent:null,path:[]}]);
}
export function subdivide(mesh: Mesh,p: Program): Mesh {
  let count=mesh.vertexCount;
  const shared=new Map<string,number[]>(), children:Tile[]=[];
  for(const tile of mesh.tiles) {
    const rule=p.rules[tile.type], local=new Map(rule.vertices.map((n,i)=>[n,tile.vertices[i]]));
    for(let i=0;i<rule.vertices.length;i++) {
      const a=tile.vertices[i], b=tile.vertices[(i+1)%tile.vertices.length];
      const names=rule.splits[rule.vertices[i]]??[], key=edgeKey(a,b);
      let ids=shared.get(key);
      if(ids && ids.length!==names.length) throw new EscherError(`Incompatible edge splits at ${tile.id} (${tile.type}): neighbors request ${ids.length} and ${names.length} new vertices.`,rule.line);
      if(!ids) {ids=names.map(()=>count++);shared.set(key,ids);}
      const oriented=a<b?ids:[...ids].reverse();
      names.forEach((name,j)=>local.set(name,oriented[j]));
    }
    rule.interior.forEach(n=>local.set(n,count++));
    rule.children.forEach((child,i)=>children.push({id:`${tile.id}.${i}`,type:child.type,vertices:child.vertices.map(n=>local.get(n)!),parent:tile.id,path:[...tile.path,i]}));
    if(children.length>MAX_TILES || count>40000)throw new EscherError(`Size limit reached (${MAX_TILES.toLocaleString()} tiles / 40,000 vertices). Reduce depth.`,rule.line);
  }
  return makeMesh(count,children);
}
export function generate(p:Program,depth=p.depth,type=p.start):Tiling {
  if(!Number.isInteger(depth) || depth<0 || depth>7)throw new EscherError('Depth must be an integer between 0 and 7.');
  const levels=[initial(p,type)];for(let i=0;i<depth;i++)levels.push(subdivide(levels[i],p));return {levels};
}

/** Local names indexed by the actual vertex IDs of a one-tile subdivision. */
export function ruleVertexLabels(rule: Program['rules'][string]):string[] {
  const labels=[...rule.vertices];let next=labels.length;
  rule.vertices.forEach((name,i)=>{
    const names=Object.hasOwn(rule.splits,name)?rule.splits[name]:[];
    const ids=names.map(()=>next++);
    if(i>(i+1)%rule.vertices.length)ids.reverse();
    names.forEach((name,j)=>{labels[ids[j]]=name;});
  });
  rule.interior.forEach(name=>{labels[next++]=name;});
  return labels;
}
