"use client";
import type { BrowseState } from "@/hooks/use-browse";
import type { BrowseModel } from "./catalog-query";
import { medicalSpecialties } from "@/lib/catalog";
import { useLocale } from "@/components/locale-provider";

export const studyLabels:Record<string,string>={trial:"Ensaio clínico",rct:"Ensaio clínico randomizado",review:"Revisão",systematic:"Revisão sistemática · filtro PubMed",meta:"Meta-análise",guideline:"Diretriz · tipo PubMed"};
const explanations=[
  ["Ensaio clínico","Avalia uma intervenção em participantes. O desenho e os métodos precisam ser conferidos no artigo."],
  ["Ensaio clínico randomizado","Distribui participantes entre grupos por sorteio. Isso não dispensa avaliar vieses e limitações."],
  ["Revisão","Reúne e discute estudos de um tema; o método de seleção pode variar."],
  ["Revisão sistemática · filtro PubMed","Usa métodos explícitos para buscar e selecionar estudos. O filtro depende da classificação disponível no PubMed."],
  ["Meta-análise","Combina quantitativamente resultados de estudos. A interpretação depende dos estudos incluídos."],
  ["Diretriz · tipo PubMed","Documento de recomendações classificado como diretriz no PubMed. O catálogo das sociedades é uma fonte separada."],
];
export function FilterHelp(){const {t}=useLocale();return <details className="filter-help"><summary>{t("Entenda os filtros")}</summary><p>{t("Os filtros ajudam a localizar publicações; não são uma nota de qualidade da evidência.")}</p><dl>{explanations.map(([name,text])=><div key={name}><dt>{t(name)}</dt><dd>{t(text)}</dd></div>)}</dl><p><strong>{t("Relevância")}: </strong>{t("Usa o Best Match do PubMed para ordenar os resultados pela correspondência com a busca.")}</p><p><strong>{t("Data de publicação")}: </strong>{t("Mostra primeiro as publicações com data mais recente. Uma data mais recente não garante maior qualidade.")}</p></details>;}
export function SearchContext({browse,model}:{browse:BrowseState;model:BrowseModel}){
  const {t}=useLocale();
  const items=[browse.tab==="sbc"?(model.hasBrazilianCatalog?`${t("Diretrizes")} ${model.societyLabel}`:t("Catálogo sem documentos")):browse.tab==="collection"?t("Estudos clássicos"):"PubMed"];
  const specialty=medicalSpecialties.find(([id])=>id===browse.specialty)?.[1];if(specialty)items.push(t(specialty));
  if(browse.topic!=="all")items.push(t(model.sbcVisibleTopics.find(([id])=>id===browse.topic)?.[1]||browse.topic));
  if(browse.type!=="all")items.push(t(browse.tab==="sbc"?browse.type:studyLabels[browse.type]||browse.type));
  if(browse.tab==="sbc"){if(browse.guidelineYear!=="all")items.push(browse.guidelineYear);}
  else {const periods:Record<string,string>={"30":"Últimos 30 dias","365":"Últimos 12 meses","1825":"Últimos 5 anos"};if(periods[browse.period])items.push(t(periods[browse.period]));if(browse.free)items.push(t("Texto completo gratuito"));}
  return <p className="search-context" aria-label={t("Resumo da busca")}>{items.join(" · ")}</p>;
}
