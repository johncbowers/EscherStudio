import {examples} from '../src/examples';
import {parse} from '../src/engine/parser';
import {generate} from '../src/engine/subdivide';
import {pack} from '../src/engine/packing';
import {MAX_CIRCLES,MAX_DEPTH,MAX_TILES,MAX_VERTICES} from '../src/engine/limits';
pack(generate(parse(examples[1].source),2).levels[2]);
const rows=[];
for(const [name,depth] of [['Chair',5],['Chair',6],['Pinwheel',5],['Pinwheel',6],['Quad',6],['Quad',7]] as const) {
 const program=parse(examples.find(e=>e.name===name)!.source);
 const start=performance.now(),mesh=generate(program,depth).levels[depth],generated=performance.now();
 const drawing=pack(mesh),finished=performance.now();
 const row={example:name,depth,tiles:mesh.tiles.length,circles:drawing.points.length,generationMs:Math.round(generated-start),packingMs:Math.round(finished-generated),iterations:drawing.iterations,angleError:drawing.residual,tangencyError:drawing.tangency,converged:drawing.converged};
 rows.push(row);console.log(JSON.stringify(row));
}
export const report={runtime:process.version,platform:process.platform,limits:{MAX_DEPTH,MAX_TILES,MAX_VERTICES,MAX_CIRCLES},rows};
