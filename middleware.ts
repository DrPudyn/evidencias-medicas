import { NextResponse, type NextRequest } from "next/server";
export function middleware(req:NextRequest){
 const headers=new Headers(req.headers);
 headers.set("x-site-locale",req.nextUrl.pathname.split("/")[1]==="en"?"en":"pt");
 const response=NextResponse.next({request:{headers}});
 const path=req.nextUrl.pathname;
 if(path.startsWith("/admin")||path.startsWith("/api")||req.nextUrl.searchParams.has("reset")||req.nextUrl.searchParams.has("verify"))response.headers.set("X-Robots-Tag","noindex, nofollow");
 const html=req.headers.get("accept")?.includes("text/html");
 if(path==="/sw.js"||html)response.headers.set("Cache-Control","private, no-store, max-age=0");
 return response;
}
