import './catalog-smoke.mjs';
import './catalog-browse-smoke.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const origin=process.env.SMOKE_ORIGIN || 'http://127.0.0.1:5173';
async function call(path,method='GET',data,cookie='',customOrigin=origin){const r=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',Origin:customOrigin,...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.status>=500)throw new Error(`${method} ${path}: HTTP ${r.status}: ${(await r.text()).slice(0,500)}`);return {status:r.status,data:await r.json().catch(()=>({})),cookie:r.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')};}
const p={mode:'register',email:`reader-${Date.now()}@example.test`,password:'A strong test password 2026'};
assert.equal((await call('/api/bookmarks')).status,401);
assert.equal((await call('/api/admin/dashboard')).status,401);
assert.equal((await call('/api/admin/catalog','POST',{})).status,401);
const refusal=await call('/api/analytics/consent','POST',{consent:false});assert.equal(refusal.status,200);assert.equal(refusal.data.consent,false);
assert.equal((await call('/api/analytics/event','POST',{event:'search',topic:'all',source:'PubMed'})).data.recorded,false);
assert.equal((await call('/api/auth/password','POST',p,'','https://invalid.example')).status,403);
assert.equal((await call('/api/auth/password','POST',{...p,password:'short'})).status,400);
assert.equal((await call('/api/auth/password','POST',{...p,email:'not-email'})).status,400);
assert.equal((await call('/api/auth/request','POST',p)).status,410);
assert.equal((await call('/api/auth/verify','POST',{email:p.email,code:'000000'})).status,410);
async function registerAndConfirm(profile){
 const registration=await call('/api/auth/password','POST',{...profile,role:'admin',name:'Ignored',crm:'123456',phone:'999'});
 assert.equal(registration.status,200);assert.equal(registration.data.verificationRequired,undefined);assert.ok(registration.cookie);
 assert.equal(registration.data.user.role,'member');
 return registration;
}
const login=await registerAndConfirm(p);
assert.equal(login.status,200);assert.ok(login.cookie);assert.equal(login.data.user.role,'member');assert.equal(login.data.user.crm,'');
assert.equal((await call('/api/auth/password','POST',p)).status,409);
assert.equal((await call('/api/auth/password','POST',{...p,mode:'login',password:'Incorrect password'})).status,401);
assert.equal((await call('/api/auth/password','POST',{...p,mode:'login'})).status,200);
assert.equal((await call('/api/account','GET',undefined,login.cookie)).data.user.email,p.email);
assert.equal((await call('/api/admin/dashboard','GET',undefined,login.cookie)).status,401);
assert.equal((await call('/api/admin/webauthn/options','POST',{action:'authenticate'},login.cookie)).status,401);
const article={id:'37952131',title:'Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes',journal:'New England Journal of Medicine',date:'2023-12-14',type:'Ensaio clínico',topic:'prevention'};
assert.equal((await call('/api/bookmarks','POST',article,login.cookie)).status,200);
assert.equal((await call('/api/bookmarks','POST',article,login.cookie)).status,200);
assert.equal((await call('/api/bookmarks','GET',undefined,login.cookie)).data.articles.length,1);
const secondProfile={...p,email:`reader-isolation-${Date.now()}@example.test`};
const secondLogin=await registerAndConfirm(secondProfile);assert.equal(secondLogin.status,200);
assert.equal((await call('/api/bookmarks','GET',undefined,secondLogin.cookie)).data.articles.length,0);

// Reading data and saved searches must remain isolated between accounts.
assert.equal((await call('/api/bookmarks','PATCH',{id:article.id,reading:{folder:'Cardiologia',tags:['revisar'],notes:'Nota privada',status:'reading'}},login.cookie)).status,200);
assert.equal((await call('/api/bookmarks','GET',undefined,login.cookie)).data.articles[0].reading.notes,'Nota privada');
assert.equal((await call('/api/bookmarks','PATCH',{id:article.id,reading:{notes:'adulterada'}},secondLogin.cookie)).status,404);
assert.equal((await call('/api/bookmarks','PATCH',{id:article.id,reading:{status:'invalid'}},login.cookie)).status,400);
assert.equal((await call('/api/bookmarks','PATCH',{id:article.id,reading:{notes:'x'.repeat(10001)}},login.cookie)).status,400);
assert.equal((await call('/api/bookmarks','PATCH',{id:article.id,reading:{}},login.cookie,'https://invalid.example')).status,403);
// Undo restores the server's latest metadata, not the article card's stale snapshot.
const removedReading=await call('/api/bookmarks?id='+article.id,'DELETE',undefined,login.cookie);
assert.equal(removedReading.status,200);
assert.deepEqual(removedReading.data.article.reading,{folder:'Cardiologia',tags:['revisar'],notes:'Nota privada',status:'reading'});
assert.equal((await call('/api/bookmarks?id='+article.id,'DELETE',undefined,secondLogin.cookie)).data.article,null,'Another account cannot retrieve removed reading metadata');
assert.equal((await call('/api/bookmarks','POST',{...removedReading.data.article,reading:{status:'invalid'}},login.cookie)).status,400);
const restoredReading=await call('/api/bookmarks','POST',removedReading.data.article,login.cookie);
assert.equal(restoredReading.status,200);
assert.deepEqual(restoredReading.data.article.reading,removedReading.data.article.reading);
assert.deepEqual((await call('/api/bookmarks','GET',undefined,login.cookie)).data.articles[0].reading,removedReading.data.article.reading);
assert.equal((await call('/api/bookmarks','POST',removedReading.data.article,login.cookie,'https://invalid.example')).status,403);
assert.equal((await call('/api/bookmarks','GET',undefined,secondLogin.cookie)).data.articles.length,0);
// A repeated save must not overwrite notes subsequently edited in another tab.
await call('/api/bookmarks','PATCH',{id:article.id,reading:{notes:'Nota mais recente'}},login.cookie);
assert.equal((await call('/api/bookmarks','POST',removedReading.data.article,login.cookie)).data.article.reading.notes,'Nota mais recente');
const savedQuery={q:'heart failure',specialty:'cardiology',topic:'all',type:'all',period:'30',free:true,sort:'recent'};
assert.equal((await call('/api/saved-searches')).status,401);
const savedSearch=await call('/api/saved-searches','POST',{name:'Minha busca',query:savedQuery,seenIds:[article.id]},login.cookie);
assert.equal(savedSearch.status,200);
assert.equal((await call('/api/saved-searches','GET',undefined,secondLogin.cookie)).data.searches.length,0);
assert.equal((await call('/api/saved-searches','PATCH',{id:savedSearch.data.id,seenIds:[]},secondLogin.cookie)).status,404);
assert.equal((await call('/api/saved-searches','DELETE',undefined,login.cookie,'https://invalid.example')).status,403);
assert.equal((await call('/api/saved-searches','POST',{name:'invalid',query:{...savedQuery,period:'bad'},seenIds:[]},login.cookie)).status,400);
assert.equal((await call('/api/saved-searches','PATCH',{id:savedSearch.data.id,seenIds:[]},login.cookie)).status,200);
assert.equal((await call('/api/saved-searches','GET',undefined,login.cookie)).data.searches[0].query.q,'heart failure');
await call('/api/saved-searches','POST',{name:'Remover com conta',query:savedQuery,seenIds:[]},secondLogin.cookie);
assert.equal((await call('/api/account/delete','DELETE',{confirmation:'EXCLUIR MINHA CONTA'},secondLogin.cookie)).status,200);
assert.equal((await call('/api/account','PATCH',{role:'admin',name:'Ignored'},login.cookie)).status,405);
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
// Reset links are single-use and invalidate existing sessions.
const reset=await call('/api/auth/reset','POST',{email:p.email});assert.equal(reset.status,200);
const token=new URL(reset.data.previewResetUrl).searchParams.get('reset');
assert.equal((await call('/api/auth/reset','POST',{token,password:'A new strong password 2026'})).status,200);
assert.equal((await call('/api/auth/reset','POST',{token,password:'A new strong password 2026'})).status,400);
assert.equal((await call('/api/account','GET',undefined,login.cookie)).data.user,null);
assert.equal((await call('/api/auth/password','POST',{...p,mode:'login'})).status,401);
const afterReset=await call('/api/auth/password','POST',{...p,mode:'login',password:'A new strong password 2026'});assert.equal(afterReset.status,200);
login.cookie=afterReset.cookie;
const adminEmail='evidenciasmedicas@outlook.com';
assert.equal((await call('/api/auth/password','POST',{...p,email:adminEmail})).status,409);
const adminReset=await call('/api/auth/reset','POST',{email:adminEmail});
const adminToken=new URL(adminReset.data.previewResetUrl).searchParams.get('reset');
assert.equal((await call('/api/auth/reset','POST',{token:adminToken,password:'Admin test password 2026 only'})).status,200);
const adminLogin=await call('/api/auth/password','POST',{email:adminEmail,password:'Admin test password 2026 only',mode:'login'});
assert.equal(adminLogin.status,200);assert.equal(adminLogin.data.user.role,'admin');assert.match(adminLogin.cookie,/admin_session=/);
assert.equal((await call('/api/admin/dashboard','GET',undefined,adminLogin.cookie)).status,200);

const editorial={articleId:article.id,source:'PubMed',title:article.title,sourceUrl:'https://invalid.example',status:'draft',reviewer:'Revisor de teste',fullTextReviewed:false,supersededBy:'',question:'Pergunta de teste',population:'População de teste',intervention:'Intervenção de teste',comparator:'Comparador de teste',results:'Resultado de teste',limitations:'Limitações de teste',applicability:'Aplicabilidade de teste',references:'Referência de teste, p. 1'};
assert.equal((await call('/api/admin/editorial','POST',editorial,login.cookie)).status,401);
assert.equal((await call('/api/admin/editorial','POST',editorial,adminLogin.cookie,'https://invalid.example')).status,403);
assert.equal((await call('/api/admin/editorial','POST',editorial,adminLogin.cookie)).status,200);
assert.equal((await call('/api/editorial')).data.items.some(x=>x.articleId===article.id),false);
assert.equal((await call('/api/admin/editorial','POST',{...editorial,status:'published'},adminLogin.cookie)).status,400);
assert.equal((await call('/api/admin/editorial','POST',{...editorial,status:'published',fullTextReviewed:true,supersededBy:'12345678'},adminLogin.cookie)).status,200);
let published=(await call('/api/editorial')).data.items.find(x=>x.articleId===article.id);
assert.equal(published.supersededBy,'12345678');
assert.equal(published.sourceUrl,`https://pubmed.ncbi.nlm.nih.gov/${article.id}/`);
assert.equal((await call('/api/admin/editorial','POST',{...editorial,results:'Novo rascunho'},adminLogin.cookie)).status,200);
assert.equal((await call('/api/editorial')).data.items.find(x=>x.articleId===article.id).results,editorial.results,'Draft does not hide or replace publication');
assert.equal((await call('/api/admin/editorial','POST',{...editorial,status:'withdrawn'},adminLogin.cookie)).status,200);
assert.equal((await call('/api/editorial')).data.items.some(x=>x.articleId===article.id),false);
assert.ok((await call('/api/admin/editorial','GET',undefined,adminLogin.cookie)).data.items.filter(x=>x.articleId===article.id).length>=4);
assert.equal((await call('/api/account','DELETE',undefined,adminLogin.cookie)).status,200);
assert.equal((await call('/api/admin/dashboard','GET',undefined,adminLogin.cookie)).status,401);
assert.equal((await call('/api/account/delete','DELETE',{confirmation:'wrong'},login.cookie)).status,400);
assert.equal((await call('/api/account/delete','DELETE',{confirmation:'EXCLUIR MINHA CONTA'},login.cookie,'','https://invalid.example')).status,403);
assert.equal((await call('/api/account/delete','DELETE',{confirmation:'EXCLUIR MINHA CONTA'},login.cookie)).status,200);
assert.equal((await call('/api/account','GET',undefined,login.cookie)).data.user,null);
assert.equal((await call('/api/bookmarks','GET',undefined,login.cookie)).status,401);
console.log('PASS: email/password signup, login, account isolation, origin, password reset/replay, session revocation, reserved administrator, panel access and canonical bookmarks.');


for(const [lang,title,heading] of [["en","Medical Evidence","Science moves forward."],["pt","Evidências Médicas","A ciência avança."]]){
 const response=await fetch(origin+"/"+lang);assert.equal(response.status,200);
 const html=await response.text();assert.ok(html.includes(title));assert.ok(html.includes(heading),"localized SSR content");
 assert.ok(html.includes('rel="canonical"'));assert.ok(html.includes("/"+lang));
 assert.match(html,new RegExp('<html[^>]*lang="'+(lang==="en"?"en":"pt-BR")+'"'));
}
assert.equal((await fetch(origin+"/fr")).status,404);
assert.equal((await fetch(origin+"/en?reset="+"a".repeat(64))).headers.get("x-robots-tag"),"noindex, nofollow");
for(const route of ["/sitemap.xml","/robots.txt"])assert.equal((await fetch(origin+route)).status,200);
