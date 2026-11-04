export function linkResult(status:number):string {
  if(status===404||status===410)return "not_found";
  if(status>=300&&status<400)return "redirect";
  if(status===405||status===501)return "unknown";
  return status>=200&&status<300?"ok":"http_error";
}
export const linkLabels:Record<string,string>={ok:"Acessível",not_found:"Não encontrado",redirect:"Redirecionamento: conferir",unknown:"Verificação inconclusiva",http_error:"Falha HTTP: conferir",pending:"Ainda não verificado"};
