import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const input = process.argv[2];
if (!input) throw new Error("Usage: npm run images:process -- <generated-image-directory>");
const names = ["room-404-door","cctv-fourth-floor","cctv-service-corridor","maya-hotel-room","maintenance-passage","maya-reed","adrian-vale","owen-pike","naomi-brooks","eli-reed"];
const entries = (await readdir(input,{withFileTypes:true})).filter((entry)=>entry.isFile()&&entry.name.endsWith(".png"));
const files = await Promise.all(entries.map(async(entry)=>({path:join(input,entry.name),stat:await import("node:fs/promises").then(({stat})=>stat(join(input,entry.name)))})));
files.sort((a,b)=>a.stat.mtimeMs-b.stat.mtimeMs);
if(files.length<names.length)throw new Error(`Expected ${names.length} PNG files, found ${files.length}`);
await mkdir("public/evidence/thumbs",{recursive:true});
for(let index=0;index<names.length;index+=1){const source=files[index].path;const name=names[index];await sharp(source).resize({width:1600,height:1600,fit:"inside",withoutEnlargement:true}).webp({quality:82,effort:6}).toFile(`public/evidence/${name}.webp`);await sharp(source).resize({width:420,height:420,fit:"cover",position:"attention"}).webp({quality:76,effort:5}).toFile(`public/evidence/thumbs/${name}.webp`);}
await sharp(files[0].path).resize(1200,630,{fit:"cover",position:"centre"}).jpeg({quality:84,mozjpeg:true}).toFile("public/og-room-404.jpg");
console.log(`Processed ${names.length} evidence assets and thumbnails.`);
