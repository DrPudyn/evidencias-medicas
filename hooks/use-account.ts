"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { Article } from "@/lib/catalog";
import { api } from "@/components/cardio/api";
import { useLocale } from "@/components/locale-provider";
import { trackClinicalEvent } from "@/lib/analytics-client";
import type { AppModal, Profile } from "@/components/cardio/types";

type AccountEnv = { tab:string; specialty:string; setTab:(tab:string)=>void; setModal:(modal:AppModal)=>void; setToast:(message:string)=>void };
export function useAccount({ tab, specialty, setTab, setModal, setToast }: AccountEnv) {
  const { t, locale } = useLocale();
  const [user,setUser]=useState<Profile|null>(null), [saved,setSaved]=useState<Article[]>([]), [saving,setSaving]=useState("");
  const [mode,setMode]=useState("login"), [email,setEmail]=useState(""), [password,setPassword]=useState(""), [resetToken,setResetToken]=useState("");
  const [busy,setBusy]=useState(false), [formError,setFormError]=useState(""), [notice,setNotice]=useState(""), [previewResetUrl,setPreviewResetUrl]=useState("");
  useEffect(()=>{
    api<{user:Profile|null}>("/api/account").then(data=>{setUser(data.user);if(data.user)void api<{articles:Article[]}>("/api/bookmarks").then(d=>setSaved(d.articles)).catch(()=>{});}).catch(()=>{});
    const url=new URL(window.location.href), token=url.searchParams.get("reset");
    if(token){
      url.searchParams.delete("reset");
      window.history.replaceState(window.history.state,"",url);
      queueMicrotask(()=>{setResetToken(token);setMode("reset");setModal("auth");});
    }
  },[setModal]);
  function openAuth(nextMode="register"){
    setMode(nextMode);setEmail("");setPassword("");setFormError("");setNotice("");setPreviewResetUrl("");setModal("auth");
  }
  function openProfile(){if(!user){openAuth("login");return;}setFormError("");setNotice("");setModal("profile");}
  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setFormError("");setNotice("");
    try{
      if(mode==="forgot"){
        const data=await api<{message:string;previewResetUrl?:string}>("/api/auth/reset",{method:"POST",body:JSON.stringify({email,lang:locale})});
        setNotice(data.message);setPreviewResetUrl(data.previewResetUrl||"");return;
      }
      if(mode==="reset"){
        await api("/api/auth/reset",{method:"POST",body:JSON.stringify({token:resetToken,password})});
        setPassword("");setResetToken("");setMode("login");setNotice("Senha definida. Entre com seu e-mail e sua senha.");return;
      }
      const data=await api<{user:Profile}>("/api/auth/password",{method:"POST",body:JSON.stringify({email,password,mode})});
      setUser(data.user);setPassword("");setModal(null);setToast("Bem-vindo! Sua conta está pronta.");
      const bookmarks=await api<{articles:Article[]}>("/api/bookmarks");setSaved(bookmarks.articles);
    }catch(error){setFormError((error as Error).message);}finally{setBusy(false);}
  }
  async function toggleSaved(article:Article){
    if(!user){openAuth("login");return;}setSaving(article.id);
    try{
      if(saved.some(item=>item.id===article.id)){
        await api(`/api/bookmarks?id=${article.id}`,{method:"DELETE"});setSaved(items=>items.filter(item=>item.id!==article.id));setToast("Artigo removido da biblioteca.");
      }else{
        await api("/api/bookmarks",{method:"POST",body:JSON.stringify(article)});
        trackClinicalEvent("bookmark",article.topic,article.source||"PubMed");setSaved(items=>[article,...items]);setToast("Artigo salvo na sua biblioteca.");
      }
    }catch(error){setToast((error as Error).message);}finally{setSaving("");}
  }
  async function logout(){
    try{await api("/api/account",{method:"DELETE"});setUser(null);setSaved([]);setModal(null);if(tab==="saved")setTab(specialty?"collection":"live");}
    catch(error){setFormError((error as Error).message);}
  }
  async function deleteAccount(){
    if(!window.confirm(t("Excluir sua conta apagará seu perfil, favoritos e sessões. Essa ação não pode ser desfeita. As métricas já agregadas e sem vínculo com a conta não serão alteradas.")))return;
    setBusy(true);
    try{await api("/api/account/delete",{method:"DELETE",body:JSON.stringify({confirmation:"EXCLUIR MINHA CONTA"})});setUser(null);setSaved([]);setModal(null);setToast("Sua conta e seus favoritos foram excluídos.");}
    catch(error){setFormError((error as Error).message);}finally{setBusy(false);}
  }
  return {user,saved,saving,mode,setMode,email,setEmail,password,setPassword,busy,formError,setFormError,notice,setNotice,previewResetUrl,openAuth,openProfile,submit,toggleSaved,logout,deleteAccount};
}
export type AccountController=ReturnType<typeof useAccount>;
