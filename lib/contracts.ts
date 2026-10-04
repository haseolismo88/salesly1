import { z } from 'zod';

export const ANGLES = ['Problem → Solution','UGC First Impression','Product Demonstration','Curiosity / Pattern Interrupt','Lifestyle / Desire','Value / Price','Objection Killer'] as const;
export const platforms = ['TikTok Shop','Shopee','Instagram / Reels','Facebook Ads'] as const;
const text = z.string().min(1).max(1600);
const score = z.number().int().min(0).max(100).nullable();
export const ProductSchema = z.object({name:z.string().max(100),price:z.string().max(20).refine(v=>v==='' || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v)<=1000000),'Enter a valid price'),audience:z.string().max(200),benefits:z.string().max(1000),platform:z.enum(platforms)});
export const FrameSchema = z.object({timestamp:z.number().min(0).max(120),dataUrl:z.string().max(110000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)});
export const AnalyzeInput = z.object({duration:z.number().min(1).max(120),frames:z.array(FrameSchema).min(8).max(12),product:ProductSchema}).strict();
export const AngleSchema = z.object({id:z.number().int().min(1).max(7),name:z.enum(ANGLES),hook:text,strategy:text,reason:text,opening:text,cta:text});
export const AnalysisSchema = z.object({overallConversionScore:z.number().int().min(0).max(100),summary:text,scores:z.object({scrollStop:score,hook:score,problemAwareness:score,desire:score,productVisibility:score,featureVsBenefit:score,productDemo:score,trust:score,humanReaction:score,tiktokNative:score,visualPacing:score,dialogue:score,offer:score,cta:score,productClickMotivation:score,purchaseTrigger:score}),strengths:z.array(text).min(1).max(5),weaknesses:z.array(text).min(1).max(5),problems:z.array(z.object({title:text,what:text,why:text,how:text})).length(3),timeline:z.array(z.object({start:z.number().min(0),end:z.number().positive(),label:text,observation:text,recommendation:text})).min(1).max(8),reasons:z.array(text).min(1).max(5),recommendations:z.array(text).min(1).max(5),limitations:z.array(text).min(1).max(5),sourceFacts:z.array(text).max(12),angles:z.array(AngleSchema).length(7)});
export const PartSchema = z.object({number:z.number().int().positive(),start:z.number().min(0),end:z.number().positive(),duration:z.number().positive().max(10),goal:text,scenes:z.array(z.object({start:z.number().min(0),end:z.number().positive(),characterAction:text,productAction:text,cameraFraming:text,facialExpression:text,productVisibility:text,dialogue:text,marketingPurpose:text})).min(1).max(5),style:text,camera:text,lighting:text,humanBehaviour:text,facialExpressions:text,voicePerformance:text,productAccuracy:text,continuity:text,negativePrompt:text});
export const PromptSchema = z.object({parts:z.array(PartSchema).min(1).max(12)});
export type Product = z.infer<typeof ProductSchema>;
export type Frame = z.infer<typeof FrameSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type Angle = z.infer<typeof AngleSchema>;
export type VideoPart = z.infer<typeof PartSchema>;
export type VideoPrompt = z.infer<typeof PromptSchema>;
export function splitDuration(duration:number) {
  if (!Number.isFinite(duration) || duration<1 || duration>120) throw new Error('Invalid duration');
  return Array.from({length:Math.ceil(duration/10)},(_,i)=>({number:i+1,start:i*10,end:Math.min(duration,(i+1)*10),duration:Math.min(10,duration-i*10)}));
}
const close=(a:number,b:number)=>Math.abs(a-b)<0.025;
export function validateAnalysis(data:unknown,duration:number):Analysis {
  const a=AnalysisSchema.parse(data);
  if(a.angles.some((v,i)=>v.id!==i+1 || v.name!==ANGLES[i])) throw new Error('Invalid angle order');
  if(!close(a.timeline[0].start,0) || !close(a.timeline.at(-1)!.end,duration) || a.timeline.some((v,i)=>v.end<=v.start || v.end>duration+.025 || (i>0&&!close(v.start,a.timeline[i-1].end)))) throw new Error('Invalid analysis timeline');
  return a;
}
export function validatePrompt(data:unknown,duration:number):VideoPrompt {
  const result=PromptSchema.parse(data); const expected=splitDuration(duration);
  if(result.parts.length!==expected.length) throw new Error('Incomplete prompt');
  result.parts.forEach((p,i)=>{
    const e=expected[i];
    if(p.number!==e.number || !close(p.start,e.start) || !close(p.end,e.end) || !close(p.duration,e.duration)) throw new Error('Invalid part duration');
    if(!close(p.scenes[0].start,0) || !close(p.scenes.at(-1)!.end,p.duration) || p.scenes.some((s,j)=>s.end<=s.start || s.end>p.duration+.025 || (j>0&&!close(s.start,p.scenes[j-1].end)))) throw new Error('Invalid scene timeline');
  }); return result;
}
export function formatPart(p:VideoPart):string {
  const keys=['style','camera','lighting','humanBehaviour','facialExpressions','voicePerformance','productAccuracy','continuity','negativePrompt'] as const;
  return `PART ${p.number} — ${p.duration.toFixed(2).replace(/\.00$/,'')} SEC (${p.start}–${p.end}s)\nGOAL: ${p.goal}\n\nSCENE TIMELINE\n${p.scenes.map(s=>`${s.start}–${s.end}s\nCharacter: ${s.characterAction}\nProduct: ${s.productAction}\nFraming: ${s.cameraFraming}\nExpression: ${s.facialExpression}\nVisibility: ${s.productVisibility}\nDialogue: ${s.dialogue}\nPurpose: ${s.marketingPurpose}`).join('\n\n')}\n\n${keys.map(k=>`${k.replace(/([A-Z])/g,' $1').toUpperCase()}: ${p[k]}`).join('\n\n')}`;
}
