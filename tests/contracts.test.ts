import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalyzeInput,ANGLES,splitDuration,validateAnalysis,validatePrompt,formatPart } from '../lib/contracts';
import { demoAnalysis,demoPrompt } from '../lib/demo';
const product={name:'Test bag',price:'89',audience:'Students',benefits:'Blue colour',platform:'TikTok Shop' as const};
for(const duration of [1,8,10,10.01,16,26,40,59.987,120]){
 test(`complete contiguous <=10s prompt parts for ${duration}s, all 7 angles`,()=>{
  const analysis=validateAnalysis(demoAnalysis(duration,product),duration);
  assert.equal(analysis.angles.length,7);assert.deepEqual(analysis.angles.map(a=>a.name),ANGLES);
  for(const angle of analysis.angles){const prompt=validatePrompt(demoPrompt(duration,product,angle),duration);assert.equal(prompt.parts.length,Math.ceil(duration/10));assert.ok(Math.abs(prompt.parts.reduce((n,p)=>n+p.duration,0)-duration)<.0001);for(const part of prompt.parts){const text=formatPart(part);assert.match(text,/NEGATIVE PROMPT/);assert.match(text,/PRODUCT ACCURACY/);assert.match(text,/CONTINUITY/);}}
 });
}
test('rejects gaps, overlaps, missing parts and incorrect duration',()=>{
 const analysis=demoAnalysis(26,product);const good=demoPrompt(26,product,analysis.angles[0]);
 let bad=structuredClone(good);bad.parts[1].start=9;assert.throws(()=>validatePrompt(bad,26));
 bad=structuredClone(good);bad.parts.pop();assert.throws(()=>validatePrompt(bad,26));
 bad=structuredClone(good);bad.parts[0].scenes[0].end=.1;assert.throws(()=>validatePrompt(bad,26));
 bad=structuredClone(good);bad.parts[0].duration=11;assert.throws(()=>validatePrompt(bad,26));
 analysis.angles[1].id=1;assert.throws(()=>validateAnalysis(analysis,26));
});
test('rejects unsafe/invalid inputs',()=>{
 for(const duration of [0,-1,NaN,Infinity,121])assert.throws(()=>splitDuration(duration));
 const base={duration:26,frames:Array.from({length:10},(_,i)=>({timestamp:i*2.5,dataUrl:'data:image/jpeg;base64,/9j/'})),product};
 assert.ok(AnalyzeInput.safeParse(base).success);
 assert.equal(AnalyzeInput.safeParse({...base,frames:[{timestamp:0,dataUrl:'https://example.com/private'}]}).success,false);
 assert.equal(AnalyzeInput.safeParse({...base,product:{...product,price:'-20'}}).success,false);
 assert.equal(AnalyzeInput.safeParse({...base,product:{...product,name:'a'.repeat(101)}}).success,false);
});
