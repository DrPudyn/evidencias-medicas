import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const handlers={}; const fallback=new Response('offline');
vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self:{location:{origin:'https://example.test'},addEventListener:(n,fn)=>handlers[n]=fn},URL,Response,caches:{match:async()=>fallback},fetch:async()=>{throw Error('offline')}});
for(const [path,mode,method,expected] of [['/','navigate','GET',true],['/api/account','navigate','GET',false],['/admin','navigate','GET',false],['/signin-with-chatgpt','navigate','GET',false],['/api/articles','cors','GET',false],['/','navigate','POST',false]]){let response;handlers.fetch({request:{url:'https://example.test'+path,mode,method},respondWith:r=>response=r});assert.equal(Boolean(response),expected,path);if(response)assert.equal(await response,fallback);}
console.log('PASS: offline navigation fallback; accounts, admin, auth, API and writes bypass cache.');
