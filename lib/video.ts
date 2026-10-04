import type { Frame } from './contracts';
export const MAX_FILE_BYTES=150*1024*1024;
function eventOnce(video:HTMLVideoElement,event:string,signal?:AbortSignal) {
  return new Promise<void>((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);video.removeEventListener(event,ok);video.removeEventListener('error',fail);signal?.removeEventListener('abort',abort);};
    const ok=()=>{cleanup();resolve();};
    const fail=()=>{cleanup();reject(new Error('Video ini tak dapat dibaca. Export semula sebagai MP4 (H.264) dan cuba lagi.'));};
    const abort=()=>{cleanup();reject(new DOMException('Cancelled','AbortError'));};
    const timer=setTimeout(fail,15000);
    video.addEventListener(event,ok,{once:true});video.addEventListener('error',fail,{once:true});signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted) abort();
  });
}
export async function extractVideo(file:File,maxSeconds:number,onProgress:(value:number)=>void,signal?:AbortSignal):Promise<{duration:number;frames:Frame[]}> {
  if(!/\.(mp4|mov)$/i.test(file.name)) throw new Error('Pilih fail MP4 atau MOV.');
  if(file.size>MAX_FILE_BYTES) throw new Error('Fail terlalu besar. Had maksimum ialah 150 MB.');
  if(file.size===0) throw new Error('Fail video kosong. Pilih video lain.');
  const video=document.createElement('video'); const url=URL.createObjectURL(file);
  video.preload='auto';video.muted=true;video.playsInline=true;
  try {
    const loaded=eventOnce(video,'loadeddata',signal);video.src=url;video.load();await loaded;
    const duration=Math.round(video.duration*1000)/1000;
    if(!Number.isFinite(duration)||duration<1) throw new Error('Video mesti sekurang-kurangnya 1 saat.');
    if(duration>maxSeconds) throw new Error(`Video terlalu panjang. Had maksimum ialah ${maxSeconds} saat.`);
    const count=10; const canvas=document.createElement('canvas');
    const scale=Math.min(1,448/Math.max(video.videoWidth,video.videoHeight));
    canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
    const ctx=canvas.getContext('2d');if(!ctx) throw new Error('Browser ini tidak menyokong pemprosesan video.');
    const frames:Frame[]=[];
    for(let i=0;i<count;i++) {
      signal?.throwIfAborted();const timestamp=i*(duration-0.05)/(count-1);
      if(Math.abs(video.currentTime-timestamp)>0.001){const sought=eventOnce(video,'seeked',signal);video.currentTime=timestamp;await sought;}
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
      frames.push({timestamp:Math.round(timestamp*1000)/1000,dataUrl:canvas.toDataURL('image/jpeg',0.65)});
      onProgress((i+1)/count);
    }
    return {duration,frames};
  } finally {video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
