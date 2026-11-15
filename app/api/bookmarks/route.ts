import { canonicalGuideline } from "@/data/catalogo";
import { guidelineToArticle } from "@/components/cardio/catalog-query";
import {body,currentUser,json,sameOrigin,settings} from "@/lib/server";
import { readingSchema } from "@/lib/reading";
import { safeNext } from "@/lib/safe-next";

function formRedirect(req: Request, next: string) {
  return Response.redirect(new URL(safeNext(next, "/pt"), req.url), 303);
}

async function bookmarkFromForm(req: Request) {
  const form = await req.formData();
  const next = String(form.get("next") || "/pt");
  const lang = next.startsWith("/en") ? "en" : "pt";
  if (!sameOrigin(req)) return formRedirect(req, next);
  const user = await currentUser(req);
  if (!user) {
    const login = lang === "en" ? "/en/entrar" : "/pt/entrar";
    return formRedirect(req, `${login}?next=${encodeURIComponent(safeNext(next, lang === "en" ? "/en" : "/pt"))}`);
  }
  const id = String(form.get("id") || "");
  const action = String(form.get("action") || "save");
  if (action === "remove") {
    await settings().DB.prepare("DELETE FROM bookmarks WHERE user_id=? AND article_id=?").bind(user.id, id).run();
    return formRedirect(req, next);
  }
  const title = String(form.get("title") || "");
  if (!title || title.length > 1500) return formRedirect(req, next);
  const guideline = canonicalGuideline(id, String(form.get("source") || ""));
  const pubmed = /^\d{1,12}$/.test(id);
  if (!pubmed && !guideline) return formRedirect(req, next);
  const safe = guideline ? guidelineToArticle(guideline, guideline.provenance.society) : {
    id, title, journal: String(form.get("journal") || "").slice(0, 250), authors: String(form.get("authors") || "").slice(0, 300),
    date: String(form.get("date") || "").slice(0, 40), type: String(form.get("type") || "").slice(0, 100),
    topic: String(form.get("topic") || "all").slice(0, 50), doi: String(form.get("doi") || "").slice(0, 200),
    url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, source: "PubMed",
  };
  const reading = readingSchema.parse({});
  await settings().DB.prepare("INSERT OR IGNORE INTO bookmarks(user_id,article_id,article,created_at,reading) VALUES(?,?,?,?,?)").bind(user.id, id, JSON.stringify(safe), Date.now(), JSON.stringify(reading)).run();
  return formRedirect(req, next);
}

export async function GET(req:Request){const u=await currentUser(req);if(!u)return json({error:"Entre para ver sua biblioteca."},401);const rows=await settings().DB.prepare("SELECT article,reading FROM bookmarks WHERE user_id=? ORDER BY created_at DESC").bind(u.id).all<{article:string;reading:string}>();return json({articles:rows.results.map(r=>({...JSON.parse(r.article),reading:JSON.parse(r.reading)}))});}

export async function PATCH(req:Request){
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 const u=await currentUser(req);if(!u)return json({error:"Entre para continuar."},401);
 try {
  const input=await body(req), reading=readingSchema.parse(input.reading);
  if(typeof input.id!=="string")return json({error:"Artigo inválido."},400);
  const result=await settings().DB.prepare("UPDATE bookmarks SET reading=? WHERE user_id=? AND article_id=?").bind(JSON.stringify(reading),u.id,input.id).run();
  return result.meta.changes?json({ok:true}):json({error:"Salve o artigo antes de organizar a leitura."},404);
 }catch{return json({error:"Confira a pasta, as etiquetas e as notas."},400);}
}

export async function POST(req:Request){
 const contentType = req.headers.get("content-type") || "";
 if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) return bookmarkFromForm(req);
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 const u=await currentUser(req);if(!u)return json({error:"Entre para salvar artigos."},401);
 try{
  const a=await body(req);if(typeof a.title!=="string"||a.title.length>1500)return json({error:"Artigo inválido."},400);
  const reading=readingSchema.parse(a.reading === undefined ? {} : a.reading);
  const id=String(a.id||"");
  const pubmed=/^\d{1,12}$/.test(id);
  const guideline=canonicalGuideline(id,String(a.source||""));
  if(!pubmed&&!guideline)return json({error:"Artigo inválido."},400);
  const safe=guideline?guidelineToArticle(guideline,guideline.provenance.society):{
    id,title:a.title,journal:String(a.journal||"").slice(0,250),authors:String(a.authors||"").slice(0,300),date:String(a.date||"").slice(0,40),type:String(a.type||"").slice(0,100),topic:String(a.topic||"all").slice(0,50),doi:String(a.doi||"").slice(0,200),url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`,source:"PubMed"
  };
  await settings().DB.prepare("INSERT OR IGNORE INTO bookmarks(user_id,article_id,article,created_at,reading) VALUES(?,?,?,?,?)").bind(u.id,id,JSON.stringify(safe),Date.now(),JSON.stringify(reading)).run();
  const stored=await settings().DB.prepare("SELECT article,reading FROM bookmarks WHERE user_id=? AND article_id=?").bind(u.id,id).first<{article:string;reading:string}>();
  return json({ok:true,article:stored?{...JSON.parse(stored.article),reading:JSON.parse(stored.reading)}:null});
 }catch{return json({error:"Não foi possível salvar o artigo."},400);}
}

export async function DELETE(req:Request){
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 const u=await currentUser(req);if(!u)return json({error:"Entre para continuar."},401);
 const id=new URL(req.url).searchParams.get("id");
 const removed=await settings().DB.prepare("DELETE FROM bookmarks WHERE user_id=? AND article_id=? RETURNING article,reading").bind(u.id,id).first<{article:string;reading:string}>();
 return json({ok:true,article:removed?{...JSON.parse(removed.article),reading:JSON.parse(removed.reading)}:null});
}
