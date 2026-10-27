import './catalog-smoke.mjs';
import './catalog-browse-smoke.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const origin=process.env.SMOKE_ORIGIN || 'http://127.0.0.1:5173';
async function call(path,method='GET',data,cookie='',customOrigin=origin){const r=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',Origin:customOrigin,...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.status>=500)throw new Error(`${method} ${path}: HTTP ${r.status}: ${(await r.text()).slice(0,500)}`);return {status:r.status,data:await r.json().catch(()=>({})),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const p={mode:'register',role:'student',name:'Estudante Teste Local',college:'Faculdade de Demonstração',state:'MG',email:`student-${Date.now()}@example.test`,phone:'',emailNotifications:false,whatsappNotifications:false,privacyConsent:true};
assert.equal((await call('/api/bookmarks')).status,401);
assert.equal((await call('/api/admin/dashboard')).status,401);
assert.equal((await call('/api/admin/catalog','POST',{})).status,401);
const refusal=await call('/api/analytics/consent','POST',{consent:false});assert.equal(refusal.status,200);assert.equal(refusal.data.consent,false);
assert.equal((await call('/api/analytics/event','POST',{event:'search',topic:'all',source:'PubMed'})).data.recorded,false);
assert.equal((await call('/api/auth/request','POST',p,'','https://invalid.example')).status,403);
assert.equal((await call('/api/auth/request','POST',{...p,state:'ZZ'})).status,400);
assert.equal((await call('/api/auth/request','POST',{...p,whatsappNotifications:true})).status,400);
const challenge=await call('/api/auth/request','POST',p);assert.equal(challenge.status,200);assert.equal(challenge.data.preview,true);assert.match(challenge.data.previewCode,/^\d{6}$/);
assert.equal((await call('/api/auth/request','POST',p)).status,429);
const wrong=challenge.data.previewCode==='000000'?'111111':'000000';assert.equal((await call('/api/auth/verify','POST',{email:p.email,code:wrong})).status,400);
const login=await call('/api/auth/verify','POST',{email:p.email,code:challenge.data.previewCode});assert.equal(login.status,200);assert.ok(login.cookie);assert.equal(login.data.user.role,'student');
assert.equal((await call('/api/auth/verify','POST',{email:p.email,code:challenge.data.previewCode})).status,400);
assert.equal((await call('/api/account','GET',undefined,login.cookie)).data.user.email,p.email);
assert.equal((await call('/api/admin/dashboard','GET',undefined,login.cookie)).status,401);
assert.equal((await call('/api/admin/webauthn/options','POST',{action:'authenticate'},login.cookie)).status,401);
const article={id:'37952131',title:'Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes',journal:'New England Journal of Medicine',date:'2023-12-14',type:'Ensaio clínico',topic:'prevention'};
assert.equal((await call('/api/bookmarks','POST',article,login.cookie)).status,200);
assert.equal((await call('/api/bookmarks','POST',article,login.cookie)).status,200);
assert.equal((await call('/api/bookmarks','GET',undefined,login.cookie)).data.articles.length,1);
const secondProfile={...p,email:`student-isolation-${Date.now()}@example.test`};const secondChallenge=await call('/api/auth/request','POST',secondProfile);assert.equal(secondChallenge.status,200);const secondLogin=await call('/api/auth/verify','POST',{email:secondProfile.email,code:secondChallenge.data.previewCode});assert.equal(secondLogin.status,200);assert.equal((await call('/api/bookmarks','GET',undefined,secondLogin.cookie)).data.articles.length,0);
assert.equal((await call('/api/account/delete','DELETE',{confirmation:'EXCLUIR MINHA CONTA'},secondLogin.cookie)).status,200);
assert.equal((await call('/api/account','PATCH',{...p,emailNotifications:true},login.cookie)).data.user.emailNotifications,true);
assert.equal((await call('/api/bookmarks?id=37952131','DELETE',undefined,login.cookie)).status,200);
assert.equal((await call('/api/bookmarks','GET',undefined,login.cookie)).data.articles.length,0);
const extra = JSON.parse(readFileSync(new URL('../data/catalogo/additional.json', import.meta.url), 'utf8')).items;
for (const society of ['SBA', 'SBP-pediatrics', 'SBGM', 'FEBRASGO']) {
  const doc = extra.find(item => item.provenance.society === society);
  assert.ok(doc, society);
  // A URL e os metadados gravados devem vir do catálogo, mesmo com entrada adulterada.
  const input = { id: doc.id, source: society, title: 'Título adulterado', url: 'https://invalid.example/phishing' };
  assert.equal((await call('/api/bookmarks', 'POST', input, login.cookie)).status, 200);
  const saved = (await call('/api/bookmarks', 'GET', undefined, login.cookie)).data.articles.find(item => item.id === doc.id);
  assert.equal(saved.url, doc.url); assert.equal(saved.title, doc.title); assert.equal(saved.source, society);
  assert.equal((await call('/api/bookmarks', 'POST', { ...input, source: 'SBC' }, login.cookie)).status, 400);
  assert.equal((await call(`/api/bookmarks?id=${doc.id}`, 'DELETE', undefined, login.cookie)).status, 200);
}
assert.equal((await call('/api/bookmarks', 'POST', { id: 'soc-inventado', source: 'SBA', title: 'Inválido' }, login.cookie)).status, 400);
assert.equal((await call('/api/account/delete','DELETE',{confirmation:'wrong'},login.cookie)).status,400);
assert.equal((await call('/api/account/delete','DELETE',{confirmation:'EXCLUIR MINHA CONTA'},login.cookie,'','https://invalid.example')).status,403);
assert.equal((await call('/api/account/delete','DELETE',{confirmation:'EXCLUIR MINHA CONTA'},login.cookie)).status,200);
assert.equal((await call('/api/account','GET',undefined,login.cookie)).data.user,null);
assert.equal((await call('/api/bookmarks','GET',undefined,login.cookie)).status,401);
console.log('PASS: account isolation, admin route guards, origin, validation, OTP, replay, cooldown, sessions, canonical society favorites, preferences, analytics refusal and confirmed account deletion.');

