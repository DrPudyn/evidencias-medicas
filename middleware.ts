import { NextResponse, type NextRequest } from "next/server";
export function middleware(req:NextRequest){
 const headers=new Headers(req.headers);
 headers.set("x-site-locale",req.nextUrl.pathname.split("/")[1]==="en"?"en":"pt");
 const response=NextResponse.next({request:{headers}});
 if(req.nextUrl.pathname.startsWith("/admin")||req.nextUrl.pathname.startsWith("/api")||req.nextUrl.searchParams.has("reset")||req.nextUrl.searchParams.has("verify"))response.headers.set("X-Robots-Tag","noindex, nofollow");
 return response;
}
