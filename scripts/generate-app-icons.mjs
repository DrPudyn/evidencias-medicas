import sharp from 'sharp';
import fs from 'node:fs';
fs.mkdirSync('public/icons',{recursive:true});
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#2a211c"/><path d="M96 270h86l36-96 70 176 42-80h86" fill="none" stroke="#f3e6d4" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/></svg>');
for(const [n,s] of [['app-192',192],['app-512',512],['apple-touch-icon',180]]) await sharp(svg).resize(s,s).png().toFile('public/icons/'+n+'.png');
