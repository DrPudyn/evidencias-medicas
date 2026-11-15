"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{outcome: string}> };
export default function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [offline, setOffline] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const sync = () => setInstalled(media.matches || Boolean((navigator as Navigator & {standalone?: boolean}).standalone));
    queueMicrotask(() => { sync(); setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)); });
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const done = () => { setInstalled(true); setPrompt(null); };
    const network = () => setOffline(!navigator.onLine);
    queueMicrotask(network);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', done);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    media.addEventListener('change', sync);
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', done); window.removeEventListener('online', network); window.removeEventListener('offline', network); media.removeEventListener('change', sync); };
  }, []);
  async function install() {
    if (!prompt) { setHelp(!help); return; }
    try { await prompt.prompt(); const result = await prompt.userChoice; if(result.outcome === 'accepted') setInstalled(true); } catch { setHelp(true); } finally { setPrompt(null); }
  }
  return <>{offline && <div className="connection-note" role="status">Sem conexão. Pesquisas e sua biblioteca precisam de internet.</div>}{!installed && <aside className="install-app" aria-label="Instalar aplicativo"><div><strong>Suas evidências, sempre à mão.</strong><p>Adicione à tela inicial e abra direto pelo ícone. Sem loja de aplicativos.</p>{help && <p id="install-help">{ios ? 'No Safari, toque em Compartilhar → Adicionar à Tela de Início → Adicionar.' : 'No menu do Chrome ou Edge, procure “Instalar aplicativo” ou “Adicionar à tela inicial”. Se estiver em outro navegador, abra este site no Chrome ou Edge.'} A busca precisa de internet.</p>}</div><button type="button" aria-expanded={help} onClick={() => void install()}>{prompt ? 'Instalar aplicativo' : help ? 'Fechar instruções' : 'Como instalar'}</button></aside>}</>;
}
