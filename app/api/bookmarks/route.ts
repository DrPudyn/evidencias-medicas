import { canonicalGuideline } from "@/data/catalogo";
import { guidelineToArticle } from "@/components/cardio/catalog-query";
import {body,currentUser,json,sameOrigin,settings} from "@/lib/server";

export async function GET(req:Request){const u=await currentUser(req);if(!u)return json({error:"Entre para ver sua biblioteca."},401);const rows=await settings().DB.prepare("SELECT article FROM bookmarks WHERE user_id=? ORDER BY created_at DESC").bind(u.id).all<{article:string}>();return json({articles:rows.results.map(r=>JSON.parse(r.article))});}

export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
 const u=await currentUser(req);if(!u)return json({error:"Entre para salvar artigos."},401);
 try{
  const a=await body(req);if(typeof a.title!=="string"||a.title.length>1500)return json({error:"Artigo inválido."},400);
  const id=String(a.id||"");
  const pubmed=/^\d{1,12}$/.test(id);
  const guideline=canonicalGuideline(id,String(a.source||""));
  if(!pubmed&&!guideline)return json({error:"Artigo inválido."},400);
  const safe=guideline?guidelineToArticle(guideline,guideline.provenance.society):{
    id,title:a.title,journal:String(a.journal||"").slice(0,250),authors:String(a.authors||"").slice(0,300),date:String(a.date||"").slice(0,40),type:String(a.type||"").slice(0,100),topic:String(a.topic||"all").slice(0,50),doi:String(a.doi||"").slice(0,200),url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`,source:"PubMed"
  };
  await settings().DB.prepare("INSERT OR IGNORE INTO bookmarks(user_id,article_id,article,created_at) VALUES(?,?,?,?)").bind(u.id,id,JSON.stringify(safe),Date.now()).run();return json({ok:true});
 }catch{return json({error:"Não foi possível salvar o artigo."},400);}
}

export async function DELETE(req:Request){if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);const u=await currentUser(req);if(!u)return json({error:"Entre para continuar."},401);const id=new URL(req.url).searchParams.get("id");await settings().DB.prepare("DELETE FROM bookmarks WHERE user_id=? AND article_id=?").bind(u.id,id).run();return json({ok:true});}

