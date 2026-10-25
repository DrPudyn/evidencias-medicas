import { json, currentUser, currentSession, localPreview, settings, sameOrigin } from "@/lib/server";
import { isAdminEmail, userForSession } from "@/lib/admin";
export async function GET(req:Request) {
 const user=await currentUser(req); if(!user)return json({authenticated:false,authorized:false},200);
 const identity=await userForSession(req); const db=settings().DB;
 const count=identity?await db.prepare("SELECT COUNT(*) AS n FROM admin_credentials WHERE user_id=?").bind(identity.id).first<{n:number}>():null;
 const state=await db.prepare("SELECT singleton_id FROM admin_bootstrap_state WHERE singleton_id=1").first();
 const enabled=settings().ADMIN_BOOTSTRAP_ENABLED==="true"&&localPreview(req)&&new URL(req.url).hostname==="localhost";
 return json({authenticated:true,authorized:isAdminEmail(user.email),hasKey:(count?.n||0)>0,bootstrapAvailable:enabled&&!state&&(!count?.n),local:localPreview(req),email:user.email});
}
export async function POST(req:Request){ if(!sameOrigin(req))return json({error:"Origem não autorizada."},403);return GET(req); }
