import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../src/scoring.js';

test('empty book scores zero', ()=>{
  assert.deepEqual(summarize({}),{days:0,hours:0,evalScore:0,finalMark:0});
});
test('full marks give 100 evaluation and 100 final', ()=>{
  const d={m_theory:'20'};
  [[4],[4],[4],[3],[3],[2],[2]].forEach(([n],gi)=>{for(let i=0;i<n;i++)d[`e${gi}_${i}`]='5'});
  for(let i=0;i<4;i++)d['q'+i]='5';
  const r=summarize(d);
  assert.equal(r.evalScore,100);
  assert.equal(r.finalMark,100); // 20 theory + 50 workplace + 30 report
});
test('group is scaled to its points', ()=>{
  const d={};for(let i=0;i<4;i++)d[`e0_${i}`]='5'; // group 0 worth 15 points
  assert.equal(summarize(d).evalScore,15);
});
test('days and hours are counted', ()=>{
  const r=summarize({a10s:'Present',a11s:'Absent (justified)',r101h:'4',r102h:'2.5',r201h:'x'});
  assert.equal(r.days,2);assert.equal(r.hours,6.5);
});
test('theory mark is capped at 20', ()=>{
  assert.equal(summarize({m_theory:'99'}).finalMark,20);
});
