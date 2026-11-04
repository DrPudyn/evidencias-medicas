"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Bookmark, ChevronDown, MoreHorizontal, Search } from "lucide-react";
import type { AccountController } from "@/hooks/use-account";
import type { BrowseState } from "@/hooks/use-browse";
import type { Article } from "@/lib/catalog";
import { emptyReading, type Reading, type SavedSearch, type SavedQuery } from "@/lib/reading";
import { SupersededNotice } from "./editorial";
import { api } from "./api";
import { useLocale } from "@/components/locale-provider";

const statusLabels = { later: "Ler depois", reading: "Em leitura", read: "Lido" };

function ReadingEditor({ article, account, onOpen }: {
  article: Article;
  account: AccountController;
  onOpen: (article: Article) => void;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState(article.reading || emptyReading);
  const [tags, setTags] = useState((article.reading?.tags || []).join(", "));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const society = article.source && article.source !== "PubMed" && article.source !== "local";
  const reading = article.reading || emptyReading;

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await account.updateReading(article.id, {
        ...draft,
        tags: tags.split(",").map(value => value.trim()).filter(Boolean),
      });
      setMessage(t("Salvo."));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <article className="library-card">
    <div className="library-card-meta">
      <span>{t(statusLabels[reading.status])}</span>
      {reading.folder && <span>{reading.folder}</span>}
      <span>{article.journal}</span>
    </div>
    {society
      ? <a className="article-title" href={article.url} target="_blank" rel="noreferrer">{article.title}</a>
      : <button className="article-title" onClick={() => onOpen(article)}>{article.title}</button>}
    <SupersededNotice articleId={article.id} />
    {reading.notes && <p className="library-note-preview">{reading.notes}</p>}
    <details className="library-edit">
      <summary>{t("Notas e organização")} <ChevronDown size={14} aria-hidden="true" /></summary>
      <form onSubmit={save}>
        <label>{t("Minhas notas")}<textarea rows={3} maxLength={10000} placeholder={t("O que você quer lembrar desta leitura?")} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label>
        <div className="reading-grid">
          <label>{t("Pasta")}<input maxLength={80} placeholder={t("Ex.: Cardiologia")} value={draft.folder} onChange={event => setDraft({ ...draft, folder: event.target.value })} /></label>
          <label>{t("Leitura")}<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as Reading["status"] })}>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
          </select></label>
        </div>
        <details className="library-extra"><summary>{t("Etiquetas e outras opções")}</summary>
          <label>{t("Etiquetas separadas por vírgula")}<input value={tags} maxLength={490} onChange={event => setTags(event.target.value)} /></label>
          <button className="library-text-action" type="button" disabled={account.saving === article.id} onClick={() => void account.toggleSaved(article)}>{t("Remover da biblioteca")}</button>
        </details>
        <p className="muted">{t("Não inclua dados identificáveis de pacientes.")}</p>
        <div className="library-save-row"><button className="button small" disabled={busy}>{t(busy ? "Salvando…" : "Salvar")}</button><span role="status">{message}</span></div>
      </form>
    </details>
  </article>;
}

export function ReadingWorkspace({ account, browse, onOpenArticle }: {
  account: AccountController;
  browse: BrowseState;
  onOpenArticle: (article: Article) => void;
}) {
  const { t, locale } = useLocale();
  const id = useId();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [folder, setFolder] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    api<{ searches: SavedSearch[] }>("/api/saved-searches")
      .then(data => { if (active) setSearches(data.searches); })
      .catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);

  async function act(task: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try { await task(); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  function apply(query: SavedQuery) {
    browse.setQ(query.q);
    browse.setQuery(query.q);
    browse.setSpecialty(query.specialty);
    browse.setTopic(query.topic);
    browse.setType(query.type);
    browse.setPeriod(query.period);
    browse.setFree(query.free);
    browse.setSort(query.sort);
    browse.setPage(1);
    browse.setTab("live");
    browse.setRefresh(value => value + 1);
  }

  function exportLibrary() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), articles: account.saved, searches }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "minha-biblioteca.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (browse.tab === "live") return <details className="saved-searches">
    <summary>{t("Buscas salvas")} {searches.length > 0 && <span className="count-badge">{searches.length}</span>}<ChevronDown size={14} aria-hidden="true" /></summary>
    <div className="saved-searches-content">
      <p>{t("Guarde uma pesquisa para repetir depois com os mesmos filtros.")}</p>
      <form className="saved-search-form" onSubmit={event => {
        event.preventDefault();
        void act(async () => {
          if (browse.loading || browse.error) throw new Error(t("Abra uma busca PubMed concluída para salvar."));
          const query = { q: browse.query, specialty: browse.specialty, topic: browse.topic, type: browse.type, period: browse.period, free: browse.free, sort: browse.sort };
          await api("/api/saved-searches", { method: "POST", body: JSON.stringify({ name: name.trim() || browse.query || t("Minha pesquisa"), query, seenIds: browse.articles.map(article => article.id) }) });
          setSearches((await api<{ searches: SavedSearch[] }>("/api/saved-searches")).searches);
          setName("");
          setMessage(t("Busca salva."));
        });
      }}>
        <label className="sr-only" htmlFor={id + "-search-name"}>{t("Nome da busca")}</label>
        <input id={id + "-search-name"} maxLength={100} placeholder={t("Nome da pesquisa (opcional)")} value={name} onChange={event => setName(event.target.value)} />
        <button className="button secondary small" disabled={busy || browse.loading || Boolean(browse.error)}>{t("Salvar pesquisa")}</button>
      </form>
      {searches.map(search => <div className="saved-search-row" key={search.id}>
        <button className="saved-search-name" disabled={busy} onClick={() => apply(search.query)}>{search.name}<small>{t("Última verificação")}: {new Date(search.checkedAt).toLocaleDateString(locale === "en" ? "en-US" : "pt-BR")}</small></button>
        <details className="saved-search-options"><summary aria-label={t("Opções da pesquisa") + ": " + search.name}><MoreHorizontal size={18} /></summary><div>
          <button disabled={busy} onClick={() => void act(async () => {
            const result = await api<{ articles: Article[] }>(`/api/articles?${new URLSearchParams({ ...search.query, free: String(search.query.free), page: "1" })}`);
            const fresh = result.articles.filter(article => !search.seenIds.includes(article.id));
            setMessage(`${fresh.length} ${t("resultados diferentes da última verificação na primeira página.")}`);
            apply(search.query);
            await api("/api/saved-searches", { method: "PATCH", body: JSON.stringify({ id: search.id, seenIds: result.articles.map(article => article.id) }) });
            setSearches((await api<{ searches: SavedSearch[] }>("/api/saved-searches")).searches);
          })}>{t("Verificar novidades")}</button>
          <button disabled={busy} onClick={() => void act(async () => {
            await api(`/api/saved-searches?id=${search.id}`, { method: "DELETE" });
            setSearches(items => items.filter(item => item.id !== search.id));
          })}>{t("Excluir busca")}</button>
        </div></details>
      </div>)}
      <p className="muted">{t("A verificação compara até 12 resultados. Não envia notificações.")}</p>
      <p role="status" aria-live="polite">{message}</p>
    </div>
  </details>;

  if (browse.tab !== "saved") return null;
  const folders = Array.from(new Set(account.saved.map(article => article.reading?.folder).filter((value): value is string => Boolean(value)))).sort();
  const items = account.saved.filter(article =>
    (!folder || article.reading?.folder === folder) &&
    (!status || (article.reading?.status || "later") === status) &&
    [article.title, article.reading?.notes, ...(article.reading?.tags || [])].join(" ").toLocaleLowerCase().includes(filter.toLocaleLowerCase())
  );

  return <section className="reading-workspace library-workspace" aria-label={t("Minhas leituras")}>
    <div className="library-heading"><div><h3>{t("Minhas leituras")}</h3><p>{t("Tudo o que você salvou, em um só lugar.")}</p></div><span className="library-total">{account.saved.length}</span></div>
    {account.saved.length > 0 && <div className="library-toolbar">
      <label className="library-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{t("Buscar nas minhas leituras")}</span><input placeholder={t("Buscar nas minhas leituras")} value={filter} onChange={event => setFilter(event.target.value)} /></label>
      <details className="library-options"><summary>{t("Opções")}{(folder || status) && <span className="library-filter-dot" aria-label={t("Filtros ativos")} />}<ChevronDown size={14} aria-hidden="true" /></summary><div>
        <label>{t("Pasta")}<select value={folder} onChange={event => setFolder(event.target.value)}><option value="">{t("Todas as pastas")}</option>{folders.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>{t("Leitura")}<select value={status} onChange={event => setStatus(event.target.value)}><option value="">{t("Todas as leituras")}</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
        <button className="library-text-action" onClick={exportLibrary}>{t("Baixar minha biblioteca")}</button>
      </div></details>
    </div>}
    {(folder || status) && <p className="library-filter-summary">{t("Mostrando")}: {[folder, status ? t(statusLabels[status as Reading["status"]]) : ""].filter(Boolean).join(" · ")}<button className="library-text-action" onClick={() => { setFolder(""); setStatus(""); }}>{t("Limpar filtros")}</button></p>}
    {items.map(article => <ReadingEditor key={article.id} article={article} account={account} onOpen={onOpenArticle} />)}
    {!items.length && <div className="empty-state"><Bookmark size={28} /><h3>{t(account.saved.length ? "Nenhuma leitura corresponde aos filtros." : "Salve sua primeira leitura")}</h3><p>{t(account.saved.length ? "Experimente remover um filtro ou buscar outro termo." : "Toque no marcador de um artigo para encontrá-lo aqui depois.")}</p></div>}
  </section>;
}
