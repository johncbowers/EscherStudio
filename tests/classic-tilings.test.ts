import {describe,it,expect} from 'vitest';
import {examples} from '../src/examples';
import {parse} from '../src/engine/parser';
import {generate,ruleVertexLabels} from '../src/engine/subdivide';
import {pack} from '../src/engine/packing';
import {tutte} from '../src/engine/tutte';
for(const [name,children,arity] of [['Sphinx',4,6],['Pinwheel',5,4],['Domino',4,6]] as const) {
  describe(name,()=>{
    const source=examples.find(e=>e.name===name)!.source,p=parse(source);
    it('remains an oriented disk through four subdivisions',()=>{
      const levels=generate(p,4).levels;
      for(let d=0;d<levels.length;d++) {
        const m=levels[d];expect(m.tiles.length).toBe(children**d);
        expect(m.vertexCount-m.edges.length+m.tiles.length).toBe(1);
        expect(m.tiles.every(t=>t.vertices.length===arity)).toBe(true);
      }
    });
    it('subdivides either reflected prototile consistently',()=>{
      for(const type of Object.keys(p.rules))expect(generate(p,3,type).levels[3].tiles.length).toBe(children**3);
    });
    it('has a harmonic drawing and a converged circle packing',()=>{
      const mesh=generate(p,2).levels[2],drawing=pack(mesh);
      expect(tutte(mesh).residual).toBeLessThan(1e-8);
      expect(drawing.converged).toBe(true);expect(drawing.tangency!).toBeLessThan(1e-6);
      for(let i=0;i<drawing.points.length;i++)for(let j=0;j<i;j++) {
        const [x,y]=drawing.points[i],[a,b]=drawing.points[j];
        expect(Math.hypot(x-a,y-b)-drawing.radii![i]-drawing.radii![j]).toBeGreaterThan(-1e-6);
      }
    });
  });
}

// Independent geometric fixtures transcribed from Figures 15 and 17.
// These coordinates only verify the scripts; the application never uses them.
it('child correspondences match the classical Euclidean similarities',()=>{
  type P=[number,number];const s=Math.sqrt(3);
  const fixtures:Record<string,{scale:number;points:Record<string,P>}>= {
    Sphinx:{scale:.5,points:{A:[0,0],B:[1,s],C:[3,s],D:[4,2*s],E:[0,2*s],F:[-2,2*s],a:[3,2*s],b:[1,2*s],c:[-1.5,1.5*s],d:[-.5,.5*s],i:[0,s],j:[-.5,1.5*s],k:[1.5,1.5*s],l:[2.5,1.5*s]}},
    Pinwheel:{scale:1/Math.sqrt(5),points:{A:[0,0],B:[-1,0],C:[0,-2],D:[0,-1],f:[-.8,-.4],g:[-.6,-.8],h:[-.4,-1.2],i:[-.2,-1.6],j:[-.4,-.2],k:[-.2,-.6]}},
    Domino:{scale:.5,points:{A:[2,0],B:[2,2],C:[2,4],D:[0,4],E:[0,2],F:[0,0],a:[2,1],b:[2,3],c:[1,4],d:[0,3],e:[0,1],f:[1,0],o:[1,1],p:[1,2],q:[1,3]}}
  };
  for(const [name,fixture] of Object.entries(fixtures)) {
    const p=parse(examples.find(e=>e.name===name)!.source);
    const point=(type:string,v:string):P=>{const [x,y]=fixture.points[v];return [type.endsWith('Mirror')?-x:x,y];};
    for(const parent of Object.values(p.rules))for(const child of parent.children) {
      const prototype=p.rules[child.type].vertices.map(v=>point(child.type,v));
      const target=child.vertices.map(v=>point(parent.name,v));
      const [x0,y0]=prototype[0],[a0,b0]=target[0];
      const dx=prototype[1][0]-x0,dy=prototype[1][1]-y0,ax=target[1][0]-a0,ay=target[1][1]-b0;
      const re=(ax*dx+ay*dy)/(dx*dx+dy*dy),im=(ay*dx-ax*dy)/(dx*dx+dy*dy);
      expect(Math.hypot(re,im)).toBeCloseTo(fixture.scale,12);
      prototype.forEach(([x,y],i)=>{
        expect(a0+re*(x-x0)-im*(y-y0)).toBeCloseTo(target[i][0],12);
        expect(b0+im*(x-x0)+re*(y-y0)).toBeCloseTo(target[i][1],12);
      });
    }
  }
});

it('rule diagrams label reversed multi-vertex edge splits correctly',()=>{
  for(const example of examples) {
    const p=parse(example.source);
    for(const rule of Object.values(p.rules)) {
      const mesh=generate(p,1,rule.name).levels[1],labels=ruleVertexLabels(rule);
      mesh.tiles.forEach((tile,i)=>expect(tile.vertices.map(v=>labels[v])).toEqual(rule.children[i].vertices));
    }
  }
});
