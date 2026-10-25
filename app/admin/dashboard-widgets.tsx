"use client";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
type EventRow = { day: string; event: string; topic: string; source: string; count: number };
type ServiceRow = { day: string; service: string; successes: number; errors: number; total_duration_ms: number };
type CatalogCheck = { result: string; checked_at: number; status_code: number | null };

function EmptyMetric({ children }: { children: string }) {
  return <div className="admin-chart-empty">{children}</div>;
}

export function ActivityChart({ events, days }: { events: EventRow[]; days: number }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const series = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of events) totals.set(item.day, (totals.get(item.day) || 0) + Number(item.count || 0));
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - index - 1));
      const key = date.toISOString().slice(0, 10);
      return { day: key, label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date), count: totals.get(key) || 0 };
    });
  }, [events, days]);
  if (!events.length) return <EmptyMetric>Sem eventos de uso consentidos neste período.</EmptyMetric>;
  const selected = series.find((row) => row.day === selectedDay);
  return <><div className="admin-chart" role="group" aria-label={`Eventos de uso consentidos por dia nos últimos ${days} dias`}>
    <ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: -18 }} accessibilityLayer onClick={(event) => { const day = (event as unknown as { activePayload?: Array<{ payload?: { day?: string } }> })?.activePayload?.[0]?.payload?.day; if (day) setSelectedDay(day); }}>
      <defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#71e6d2" stopOpacity={0.35}/><stop offset="92%" stopColor="#71e6d2" stopOpacity={0.01}/></linearGradient></defs>
      <CartesianGrid stroke="#27334d" strokeDasharray="3 5" vertical={false}/>
      <XAxis dataKey="label" tick={{ fill: "#92a0bc", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24}/>
      <YAxis allowDecimals={false} tick={{ fill: "#92a0bc", fontSize: 10 }} axisLine={false} tickLine={false}/>
      <Tooltip contentStyle={{ background: "#111a2d", border: "1px solid #35425f", borderRadius: 9, color: "#eff5ff" }} labelStyle={{ color: "#93a8cb" }} formatter={(value) => [value, "Eventos"]}/>
      <Area type="monotone" dataKey="count" stroke="#71e6d2" strokeWidth={2} fill="url(#activityFill)" activeDot={{ r: 5, fill: "#b5fff0", stroke: "#153c45" }}/>
    </AreaChart></ResponsiveContainer>
  </div>{selected&&<p className="admin-chart-selection" aria-live="polite">{new Intl.DateTimeFormat("pt-BR",{dateStyle:"long",timeZone:"UTC"}).format(new Date(`${selected.day}T12:00:00Z`))}: <strong>{selected.count} eventos</strong> <button onClick={()=>setSelectedDay(null)}>Limpar seleção</button></p>}</>;
}

export function SourceChart({ events }: { events: EventRow[] }) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const rows = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of events) totals.set(item.source, (totals.get(item.source) || 0) + Number(item.count || 0));
    return ["PubMed", "SBC", "local", "all"].filter((source) => totals.has(source)).map((source) => ({ source: source === "all" ? "Geral" : source, count: totals.get(source) || 0 }));
  }, [events]);
  if (!rows.length) return <EmptyMetric>Distribuição por fonte ainda sem dados.</EmptyMetric>;
  const selected = rows.find((row) => row.source === selectedSource);
  return <><div className="admin-chart admin-chart-short" role="group" aria-label="Eventos consentidos por fonte">
    <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: -20 }} accessibilityLayer onClick={(event) => { const source = (event as unknown as { activePayload?: Array<{ payload?: { source?: string } }> })?.activePayload?.[0]?.payload?.source; if (source) setSelectedSource(source); }}>
      <CartesianGrid stroke="#27334d" strokeDasharray="3 5" vertical={false}/>
      <XAxis dataKey="source" tick={{ fill: "#aab6ce", fontSize: 10 }} axisLine={false} tickLine={false}/>
      <YAxis allowDecimals={false} tick={{ fill: "#92a0bc", fontSize: 10 }} axisLine={false} tickLine={false}/>
      <Tooltip contentStyle={{ background: "#111a2d", border: "1px solid #35425f", borderRadius: 9, color: "#eff5ff" }} formatter={(value) => [value, "Eventos"]}/>
      <Bar dataKey="count" name="Eventos" fill="#a78bfa" radius={[5, 5, 0, 0]} maxBarSize={52}/>
    </BarChart></ResponsiveContainer>
  </div>{selected&&<p className="admin-chart-selection" aria-live="polite">{selected.source}: <strong>{selected.count} eventos</strong> <button onClick={()=>setSelectedSource(null)}>Limpar seleção</button></p>}</>;
}

export function SystemFlow({ services, catalogChecks, now }: { services: ServiceRow[]; catalogChecks: CatalogCheck[]; now: number }) {
  const [selected, setSelected] = useState("pubmed");
  const pubmed = services.filter((item) => item.service === "pubmed");
  const successes = pubmed.reduce((sum, item) => sum + Number(item.successes), 0);
  const errors = pubmed.reduce((sum, item) => sum + Number(item.errors), 0);
  const average = successes + errors ? Math.round(pubmed.reduce((sum, item) => sum + Number(item.total_duration_ms), 0) / (successes + errors)) : null;
  const freshChecks = catalogChecks.filter((item) => item.checked_at >= now - 30 * 86400000);
  const sbcOk = freshChecks.filter((item) => item.result === "ok").length;
  const sbcFailures = freshChecks.filter((item) => ["not_found", "http_error"].includes(item.result)).length;
  const sbcStatus = !freshChecks.length ? "unknown" : sbcOk && sbcFailures ? "degraded" : sbcOk ? "healthy" : sbcFailures === freshChecks.length ? "down" : "unknown";
  const sbcDetail = freshChecks.length ? `${sbcOk}/${freshChecks.length} links responderam a HEAD nos últimos 30 dias; ${sbcFailures} falhas HTTP/404. Verificação manual, não monitoramento contínuo.` : "Sem verificação recente; disponibilidade desconhecida. O catálogo SBC é uma seleção local.";
  const checks = [
    { id: "browser", label: "Navegador", status: "unknown", detail: "Saúde do navegador não é instrumentada." },
    { id: "app", label: "Aplicação", status: "unknown", detail: "Saúde geral da aplicação ainda não é instrumentada." },
    { id: "auth", label: "Autenticação", status: "unknown", detail: "Contagens de autenticação ainda não são instrumentadas." },
    { id: "db", label: "Banco D1", status: "unknown", detail: "Latência e disponibilidade do banco ainda não são instrumentadas." },
    { id: "pubmed", label: "PubMed", status: successes === 0 && errors === 0 ? "unknown" : errors === 0 ? "healthy" : successes === 0 ? "down" : "degraded", detail: successes + errors ? `${successes} consultas registradas · ${errors} falhas · média ${average} ms no período consultado.` : "Ainda sem métricas de consulta." },
    { id: "sbc", label: "Catálogo SBC", status: sbcStatus, detail: sbcDetail },
  ];
  const active = checks.find((item) => item.id === selected) || checks[0];
  const statusLabel = { healthy: "Saudável", degraded: "Degradado", down: "Indisponível", unknown: "Desconhecido" } as const;
  const node = (id: string) => { const item = checks.find((entry) => entry.id === id)!; return <button type="button" key={id} className={`admin-flow-node ${id === selected ? "selected" : ""}`} onClick={() => setSelected(id)} aria-pressed={id === selected}><span className={`admin-status-dot status-${item.status}`}/><strong>{item.label}</strong><small>{statusLabel[item.status as keyof typeof statusLabel]}</small></button>; };
  return <div className="admin-flow-wrap">
    <div className="admin-flow-core" aria-label="Navegador envia requisições à aplicação, que consulta o banco de dados"><div className="admin-flow-lane">{node("browser")}<span className="admin-flow-arrow" aria-hidden="true">→</span>{node("app")}<span className="admin-flow-arrow" aria-hidden="true">→</span>{node("db")}</div></div>
    <div className="admin-flow-branches"><div><span>Aplicação →</span>{node("auth")}<small>sessão</small></div><div><span>Aplicação →</span>{node("pubmed")}<small>busca externa</small></div><div><span>Navegador →</span>{node("sbc")}<small>documento original</small></div></div>
    <div className="admin-flow-detail"><span className={`admin-status-dot status-${active.status}`}/><strong>{active.label}</strong><span>{active.detail}</span></div>
  </div>;
}
