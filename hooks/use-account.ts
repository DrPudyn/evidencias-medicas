"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Article } from "@/lib/catalog";
import { api } from "@/components/cardio/api";
import { useLocale } from "@/components/locale-provider";
import { trackClinicalEvent } from "@/lib/analytics-client";
import type { AppModal, Profile } from "@/components/cardio/types";
import type { Reading } from "@/lib/reading";

type AccountEnv = { tab:string; specialty:string; setTab:(tab:string)=>void; setModal:(modal:AppModal)=>void; setToast:(message:string)=>void; initialUser?: Profile | null; initialSaved?: Article[] };
export function useAccount({ tab, specialty, setTab, setModal, setToast, initialUser = null, initialSaved = [] }: AccountEnv) {
  const { t, locale } = useLocale();
  const activeUser = useRef<string | null>(null), restoring = useRef(false);
  const [undoRemoval,setUndoRemoval] = useState<{article:Article;index:number;ownerId:string}|null>(null);
  const [undoBusy,setUndoBusy] = useState(false), [undoError,setUndoError] = useState("");
  const [user,setUser]=useState<Profile|null>(initialUser), [saved,setSaved]=useState<Article[]>(initialSaved), [saving,setSaving]=useState("");
  const [mode,setMode]=useState("login"), [email,setEmail]=useState(""), [password,setPassword]=useState(""), [resetToken,setResetToken]=useState("");
  const [verifyToken,setVerifyToken]=useState(""),[adminReturn,setAdminReturn]=useState(false);
  const [busy,setBusy]=useState(false), [formError,setFormError]=useState(""), [notice,setNotice]=useState(""), [previewResetUrl,setPreviewResetUrl]=useState("");
  useEffect(() => { activeUser.current = user ? user.id || user.email : null; }, [user]);
  useEffect(() => {
    if (!undoRemoval) return;
    const timer = setTimeout(() => setUndoRemoval(null), 10000);
    return () => clearTimeout(timer);
  }, [undoRemoval]);
  useEffect(()=>{
    api<{user:Profile|null}>("/api/account").then(data=>{setUser(data.user);if(data.user)void api<{articles:Article[]}>("/api/bookmarks").then(d=>setSaved(d.articles)).catch(()=>{});}).catch(()=>{});
    const url=new URL(window.location.href), token=url.searchParams.get("reset"),verification=url.searchParams.get("verify");
    const returnAdmin=url.searchParams.get("next")==="admin";
    if(token||verification){
      url.searchParams.delete("reset");url.searchParams.delete("verify");url.searchParams.delete("next");
      window.history.replaceState(window.history.state,"",url);
      queueMicrotask(()=>{setAdminReturn(returnAdmin);setResetToken(token||"");setVerifyToken(verification||"");setMode(verification?"verify":"reset");setModal("auth");});
    }
  },[setModal]);
  function openAuth(nextMode="register"){
    setMode(nextMode);setEmail("");setPassword("");setFormError("");setNotice("");setPreviewResetUrl("");setModal("auth");
  }
  function openProfile(){if(!user){openAuth("login");return;}setFormError("");setNotice("");setModal("profile");}
  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setFormError("");setNotice("");
    try{
      if(mode==="verify"){
        await api("/api/auth/confirm-email",{method:"POST",body:JSON.stringify({token:verifyToken})});
        setVerifyToken("");setMode("login");setNotice("E-mail confirmado. Agora entre com sua senha.");return;
      }
      if(mode==="forgot"){
        const data=await api<{message:string;previewResetUrl?:string}>("/api/auth/reset",{method:"POST",body:JSON.stringify({email,lang:locale})});
        setNotice(data.message);setPreviewResetUrl(data.previewResetUrl||"");return;
      }
      if(mode==="reset"){
        const reset=await api<{email:string}>("/api/auth/reset",{method:"POST",body:JSON.stringify({token:resetToken,password})});
        if(reset.email)setEmail(reset.email);
        setPassword("");setResetToken("");setMode("login");setNotice("Senha definida. Entre com seu e-mail e sua senha.");return;
      }
      const data=await api<{user:Profile;verificationRequired?:boolean;message?:string;previewVerificationUrl?:string}>("/api/auth/password",{method:"POST",body:JSON.stringify({email,password,mode,lang:locale})});
      if(data.verificationRequired){setPassword("");setNotice(data.message||"Confira seu e-mail para confirmar o cadastro.");setPreviewResetUrl(data.previewVerificationUrl||"");setMode("pending");return;}
      if(adminReturn&&data.user.role==="admin"){window.location.assign("/admin");return;}
      setUser(data.user);setPassword("");setModal(null);setToast("Bem-vindo! Sua conta está pronta.");
      const bookmarks=await api<{articles:Article[]}>("/api/bookmarks");setSaved(bookmarks.articles);
    }catch(error){setFormError((error as Error).message);}finally{setBusy(false);}
  }
  async function toggleSaved(article:Article){
    if(!user){openAuth("login");return;}
    const ownerId=user.id||user.email;
    const already=saved.some(item=>item.id===article.id);
    const previous=saved;
    setSaving(article.id);
    setSaved(already?items=>items.filter(item=>item.id!==article.id):items=>[{...article},...items.filter(item=>item.id!==article.id)]);
    try{
      if(already){
        const removed=await api<{article:Article|null}>(`/api/bookmarks?id=${encodeURIComponent(article.id)}`,{method:"DELETE"});
        if(activeUser.current!==ownerId)return;
        const index=previous.findIndex(item=>item.id===article.id);
        if(removed.article){setUndoError("");setUndoRemoval({article:removed.article,index,ownerId});}
        setToast("Artigo removido da biblioteca.");
      }else{
        const result=await api<{article:Article}>("/api/bookmarks",{method:"POST",body:JSON.stringify(article)});
        if(activeUser.current!==ownerId)return;
        setUndoRemoval(current=>current?.article.id===article.id?null:current);
        trackClinicalEvent("bookmark",article.topic,article.source||"PubMed");
        if(result.article)setSaved(items=>[result.article,...items.filter(item=>item.id!==article.id)]);
        setToast("Artigo salvo na sua biblioteca.");
      }
    }catch(error){setSaved(previous);setToast((error as Error).message);}finally{setSaving("");}
  }
  async function restoreRemoved(){
    const pending=undoRemoval;
    if(!pending||activeUser.current!==pending.ownerId||restoring.current)return;
    restoring.current=true;setUndoBusy(true);setUndoError("");
    try{
      const result=await api<{article:Article}>("/api/bookmarks",{method:"POST",body:JSON.stringify(pending.article)});
      if(activeUser.current!==pending.ownerId)return;
      setSaved(items=>{if(items.some(item=>item.id===result.article.id))return items;const restored=[...items];restored.splice(Math.max(0,pending.index),0,result.article);return restored;});
      setUndoRemoval(current=>current===pending?null:current);
      setToast("Leitura restaurada com suas notas e organização.");
    }catch(error){setUndoError((error as Error).message);}
    finally{restoring.current=false;setUndoBusy(false);}
  }
  function dismissUndo(){setUndoRemoval(null);setToast("");}
  async function logout(){
    try{await api("/api/account",{method:"DELETE"});activeUser.current=null;setUndoRemoval(null);setUser(null);setSaved([]);setModal(null);if(tab==="saved")setTab(specialty?"collection":"live");}
    catch(error){setFormError((error as Error).message);}
  }
  async function updateReading(id:string,reading:Reading){
    await api("/api/bookmarks",{method:"PATCH",body:JSON.stringify({id,reading})});
    setSaved(items=>items.map(item=>item.id===id?{...item,reading}:item));
  }
  async function deleteAccount(){
    if(!window.confirm(t("Excluir sua conta apagará seu perfil, favoritos e sessões. Essa ação não pode ser desfeita. As métricas já agregadas e sem vínculo com a conta não serão alteradas.")))return;
    setBusy(true);
    try{await api("/api/account/delete",{method:"DELETE",body:JSON.stringify({confirmation:"EXCLUIR MINHA CONTA"})});activeUser.current=null;setUndoRemoval(null);setUser(null);setSaved([]);setModal(null);setToast("Sua conta e seus favoritos foram excluídos.");}
    catch(error){setFormError((error as Error).message);}finally{setBusy(false);}
  }
  return {undoRemoval,undoBusy,undoError,restoreRemoved,dismissUndo,user,saved,saving,mode,setMode,email,setEmail,password,setPassword,busy,formError,setFormError,notice,setNotice,previewResetUrl,openAuth,openProfile,submit,toggleSaved,updateReading,logout,deleteAccount};
}
export type AccountController=ReturnType<typeof useAccount>;
