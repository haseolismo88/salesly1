import { AnalyzeInput, AnalysisSchema, validateAnalysis } from '@/lib/contracts';
import { demoAnalysis } from '@/lib/demo';
import { settings,throttle,readBody,HttpError,structured,safety,seal,errorResponse } from '@/lib/server';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(request:Request){try{
 throttle(request);const input=AnalyzeInput.parse(await readBody(request));const config=settings();
 if(input.duration>config.maxSeconds)throw new HttpError(400,`Video exceeds the ${config.maxSeconds}-second limit.`);
 if(input.frames.some((f,i)=>f.timestamp>input.duration||(i>0&&f.timestamp<=input.frames[i-1].timestamp))||input.frames[0].timestamp>.1||input.frames.at(-1)!.timestamp<input.duration*.8)throw new HttpError(400,'Frames must cover the whole video in timestamp order.');
 for(const f of input.frames){const bytes=Buffer.from(f.dataUrl.split(',')[1],'base64');if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw new HttpError(400,'Invalid JPEG frame.');}
 const raw=config.mock?demoAnalysis(input.duration,input.product):await structured(AnalysisSchema,'sales_diagnosis',`${safety}\nAnalyze all 16 score dimensions. Use null when unassessable, especially dialogue and unsupported offer/trust. Return exactly 3 biggest problems explaining WHAT, WHY and HOW; detailed continuous timeline covering exactly 0 to duration, strengths, weaknesses, reasons and actionable recommendations. Record only grounded product facts in sourceFacts. Always return exactly 7 DIFFERENT angles in this exact order and id: 1 Problem → Solution; 2 UGC First Impression; 3 Product Demonstration; 4 Curiosity / Pattern Interrupt; 5 Lifestyle / Desire; 6 Value / Price; 7 Objection Killer. Each angle needs a distinct hook, strategy, reason it may convert better, visual opening and CTA. Do not generate full scripts yet. Be concise: each text field 1–2 short sentences.`,[{role:'user',content:[{type:'input_text',text:JSON.stringify({duration:input.duration,product:input.product,audioAvailable:false})},...input.frames.flatMap(f=>[{type:'input_text' as const,text:`Frame at ${f.timestamp} seconds`},{type:'input_image' as const,image_url:f.dataUrl,detail:'low' as const}])]}],8500);
 const analysis=validateAnalysis(raw,input.duration);analysis.scores.dialogue=null;
 return Response.json({analysis,token:seal({analysis,product:input.product,duration:input.duration,mock:config.mock}),mock:config.mock},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return errorResponse(error);}}
