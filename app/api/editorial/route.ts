import { json, settings } from "@/lib/server";
export async function GET() {
  // A withdrawal supersedes earlier publications, while a new draft does not.
  const rows=await settings().DB.prepare("SELECT v.content,v.id,v.created_at FROM editorial_versions v WHERE v.status='published' AND NOT EXISTS (SELECT 1 FROM editorial_versions n WHERE n.article_id=v.article_id AND n.status IN ('published','withdrawn') AND (n.created_at>v.created_at OR (n.created_at=v.created_at AND n.rowid>v.rowid))) ORDER BY v.created_at DESC LIMIT 500").all<{content:string;id:string;created_at:number}>();
  return json({items:rows.results.map(r=>({...JSON.parse(r.content),id:r.id,createdAt:r.created_at}))});
}
