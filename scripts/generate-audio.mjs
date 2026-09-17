import { mkdirSync, writeFileSync } from "node:fs";

const rate = 44100;
const clamp = (value) => Math.max(-1, Math.min(1, value));
const wav = (samples, filename) => {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + samples.length * 2, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(Math.round(clamp(sample) * 32767), 44 + index * 2));
  writeFileSync(`public/audio/${filename}`, buffer);
};
const make = (seconds) => new Float32Array(Math.ceil(seconds * rate));
const tone = (samples, start, duration, frequency, volume=.2, decay=4) => { const from=Math.floor(start*rate), to=Math.min(samples.length,Math.floor((start+duration)*rate)); for(let i=from;i<to;i++){const t=(i-from)/rate; samples[i]+=Math.sin(2*Math.PI*frequency*t)*volume*Math.exp(-decay*t);} };
const noise = (samples,start,duration,volume=.1,decay=6) => {const from=Math.floor(start*rate),to=Math.min(samples.length,Math.floor((start+duration)*rate));let last=0;for(let i=from;i<to;i++){const t=(i-from)/rate;last=.72*last+.28*(Math.random()*2-1);samples[i]+=last*volume*Math.exp(-decay*t);}};
const knock = (samples,start) => {noise(samples,start,.14,.7,25);tone(samples,start,.18,92,.36,18);tone(samples,start,.12,147,.16,22);};
const chime = (samples,start) => {tone(samples,start,.62,880,.22,4.5);tone(samples,start+.03,.7,1320,.12,4.2);tone(samples,start+.07,.65,1760,.08,4.8);};

mkdirSync("public/audio",{recursive:true});
const rec=make(11.6); [0,2.5,5.1,8.3].forEach((start)=>chime(rec,start)); [1.0,1.34,1.68].forEach((start)=>knock(rec,start)); [6.08,6.42,6.76,7.10].forEach((start)=>knock(rec,start)); [9.30,9.66].forEach((start)=>knock(rec,start)); noise(rec,0,11.6,.012,.02); wav(rec,"rec-001.wav");
const ambience=make(18);for(let i=0;i<ambience.length;i++){const t=i/rate;ambience[i]=(Math.random()*2-1)*.008+Math.sin(2*Math.PI*54*t)*.006+Math.sin(2*Math.PI*.17*t)*.012;}[2,7,13.4].forEach(s=>noise(ambience,s,.7,.035,2));wav(ambience,"room-ambience.wav");
const connection=make(2);tone(connection,.05,.6,440,.16,3);tone(connection,.26,.7,660,.18,3);tone(connection,.5,1,990,.16,3);wav(connection,"connection-established.wav");
const unlocked=make(1.8);[0,.14,.3,.47].forEach((s,i)=>tone(unlocked,s,.55,[294,392,494,659][i],.18,5));noise(unlocked,0,.2,.05,8);wav(unlocked,"evidence-unlocked.wav");
const incoming=make(.8);tone(incoming,.02,.2,1100,.1,7);tone(incoming,.22,.35,1460,.08,8);wav(incoming,"incoming-message.wav");
const ringtone=make(5.5);for(let s=0;s<5;s+=1.35){tone(ringtone,s,.48,523,.15,2);tone(ringtone,s+.06,.48,659,.1,2);tone(ringtone,s+.55,.45,392,.12,2);}wav(ringtone,"simulated-call.wav");
const call=make(1.2);noise(call,0,.25,.04,7);tone(call,.1,.35,350,.1,5);tone(call,.36,.5,520,.08,5);wav(call,"call-connected.wav");
const packet=make(2.2);for(let i=0;i<14;i++)tone(packet,i*.09,.18,190+i*31,.035,8);noise(packet,0,1.5,.05,2);wav(packet,"encrypted-packet.wav");
const solved=make(4.2);[0,.35,.7,1.15,1.65].forEach((s,i)=>{tone(solved,s,1.4,[220,294,370,440,587][i],.13,2.2);tone(solved,s+.02,1.2,[330,440,554,659,880][i],.055,2.4);});wav(solved,"case-solved.wav");
console.log("Generated 8 original PCM WAV assets in public/audio");
