import sharp from 'sharp';
import fs from 'node:fs';
fs.mkdirSync('public/icons',{recursive:true});
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#16342f"/><path d="M110 266h74l38-105 66 192 40-87h74" fill="none" stroke="#d4ebd0" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/></svg>');
for(const [n,s] of [['app-192',192],['app-512',512],['apple-touch-icon',180]]) await sharp(svg).resize(s,s).png().toFile('public/icons/'+n+'.png');
