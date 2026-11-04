import {json,currentUser} from "@/lib/server";
import {isAdminEmail} from "@/lib/admin";
import {mailReady} from "@/lib/mail";
export async function GET(req:Request){
 const user=await currentUser(req);
 return json({authenticated:Boolean(user),authorized:Boolean(user&&isAdminEmail(user.email)),email:user?.email,emailDeliveryReady:mailReady(req)});
}
