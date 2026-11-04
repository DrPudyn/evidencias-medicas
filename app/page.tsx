import { redirect } from "next/navigation";
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams,params=new URLSearchParams();
 for(const [key,value] of Object.entries(query))if(typeof value==="string"&&key!=="lang")params.set(key,value);
 const path=query.lang==="en"?"/en":"/pt";
 redirect(path+(params.size?"?"+params:""));
}
