import { allGuidelines } from "@/data/catalogo";
import { requireAdmin } from "@/lib/admin";
import { body, json, sameOrigin, settings } from "@/lib/server";
import { clinicalFields, editorialSchema } from "@/lib/reading";
export async function GET(req:Request) {
  if(!await requireAdmin(req))return json({error:"Sessão administrativa necessária."},401);
  const rows=await settings().DB.prepare("SELECT content,id,created_at FROM editorial_versions ORDER BY created_at DESC,rowid DESC LIMIT 500").all<{content:string;id:string;created_at:number}>();
  return json({items:rows.results.map(r=>({...JSON.parse(r.content),id:r.id,createdAt:r.created_at}))});
}
export async function POST(req:Request) {
  if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);
  const admin=await requireAdmin(req);if(!admin)return json({error:"Sessão administrativa necessária."},401);
  try {
    const input=editorialSchema.parse(await body(req,60000));
    const guideline=allGuidelines.find(g=>g.id===input.articleId);
    if(guideline){input.sourceUrl=guideline.url;input.title=guideline.title;input.source=guideline.provenance.society;}
    else if(/^\d{1,12}$/.test(input.articleId)){input.sourceUrl=`https://pubmed.ncbi.nlm.nih.gov/${input.articleId}/`;input.source="PubMed";}
    else return json({error:"Escolha um documento do catálogo ou um PMID válido."},400);
    if(input.supersededBy&&!allGuidelines.some(g=>g.id===input.supersededBy)&&!/^\d{1,12}$/.test(input.supersededBy))return json({error:"Documento substituto inválido."},400);
    if(input.supersededBy===input.articleId)return json({error:"O documento não pode substituir a si mesmo."},400);
    if(input.status==="published"&&(!input.fullTextReviewed||!input.reviewer||Object.keys(clinicalFields).some(key=>!input[key as keyof typeof clinicalFields].trim())))return json({error:"Para publicar, identifique o revisor, confirme a leitura integral e preencha todos os campos da ficha."},400);
    const id=crypto.randomUUID(), now=Date.now();
    await settings().DB.batch([
      settings().DB.prepare("INSERT INTO editorial_versions(id,article_id,actor_user_id,content,status,created_at) VALUES(?,?,?,?,?,?)").bind(id,input.articleId,admin.id,JSON.stringify(input),input.status,now),
      settings().DB.prepare("INSERT INTO admin_audit_log(id,actor_user_id,action,outcome,target_id,created_at) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(),admin.id,"editorial_"+input.status,"success",input.articleId,now),
    ]);
    return json({id});
  }catch{return json({error:"Não foi possível salvar a ficha. Confira os campos."},400);}
}
