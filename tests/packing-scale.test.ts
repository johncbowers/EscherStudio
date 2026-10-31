import {it,expect} from 'vitest';
import {parse} from '../src/engine/parser';
import {generate} from '../src/engine/subdivide';
import {pack} from '../src/engine/packing';
import {examples} from '../src/examples';
it('packs the chair at depth four (256 tiles) with measured closure',()=>{
  const mesh=generate(parse(examples[0].source),4).levels[4];const d=pack(mesh);
  expect(d.converged).toBe(true);expect(d.tangency!).toBeLessThan(1e-6);
  expect(d.points.length).toBe(mesh.vertexCount+mesh.tiles.length);
});
