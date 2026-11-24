import assert from 'node:assert/strict';
import {FORMS,generateGenome,mutateGenome,evolveGenome,evaluateGenome,getPlatformPose,validateGraph,hashGenome} from './core.mjs';

const initial=generateGenome(483921);
assert.deepEqual(initial,generateGenome(483921));
assert.notDeepEqual(initial,generateGenome(483922));
assert.equal(initial.form,0);
assert.equal(validateGraph(initial),true);
const child=mutateGenome(initial,1928);
assert.equal(child.generation,1);
assert.notEqual(child.form,initial.form,'Every evolution must change overall architecture');
assert.equal(validateGraph(child),true);
assert.deepEqual(child.edges,initial.edges,'Bridges remain connected');
assert.notEqual(hashGenome(initial),hashGenome(child));
const ea=evolveGenome(initial,1111);
assert.deepEqual(ea,evolveGenome(initial,1111),'Evolution must be reproducible');
assert.equal(ea.candidates,12);
assert.notEqual(ea.genome.form,initial.form);
assert.ok(FORMS.includes(ea.metrics.form));
for(let seed=1;seed<=150;seed++){
  const g=generateGenome(seed);
  assert.ok(validateGraph(g));
  assert.ok(g.nodes.length>=8);
  const next=evolveGenome(g,seed*13);
  assert.equal(validateGraph(next.genome),true);
  assert.notEqual(next.genome.form,g.form);
  const poses=g.nodes.map(n=>getPlatformPose(next.genome,n));
  assert.ok(poses.every(p=>[p.x,p.y,p.z,p.flip,p.tiltX,p.tiltZ].every(Number.isFinite)));
  assert.ok(evaluateGenome(next.genome).score>0);
}
console.log('PASS: 150-seed sweep; deterministic generation, connectivity, repeatable evolution, architectural form changes, finite geometry.');
