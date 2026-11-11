"use client";

import { ReadingWorkspace } from "@/components/cardio/reading-workspace";
import { EditorialProvider } from "@/components/cardio/editorial";
import AnalyticsConsent from "@/components/analytics-consent";
import { AuthModal } from "@/components/cardio/account-auth";
import { ProfileModal } from "@/components/cardio/account-profile";
import { ArticleDetail } from "@/components/cardio/article-detail";
import { browseModel } from "@/components/cardio/catalog-query";
import { ExploreSection } from "@/components/cardio/explore-section";
import { FeaturesSection } from "@/components/cardio/features-section";
import { HeroSection } from "@/components/cardio/hero-section";
import { JoinBanner } from "@/components/cardio/join-banner";
import { PlansSection } from "@/components/cardio/plans-section";
import { PrivacyNotice } from "@/components/cardio/privacy-notice";
import { scrollToExplore } from "@/components/cardio/scroll";
import { SearchGuide } from "@/components/cardio/search-guide";
import { SiteFooter } from "@/components/cardio/site-footer";
import { SiteHeader } from "@/components/cardio/site-header";
import { Toast } from "@/components/cardio/toast";
import type { Article } from "@/lib/catalog";
import { trackClinicalEvent } from "@/lib/analytics-client";
import { useAccount } from "@/hooks/use-account";
import { useArticleDetail } from "@/hooks/use-article-detail";
import { useBrowse } from "@/hooks/use-browse";
import { useToast } from "@/hooks/use-toast";

export default function CardioApp() {
  const browse = useBrowse();
  const { toast, setToast } = useToast();
  const account = useAccount({
    tab: browse.tab,
    specialty: browse.specialty,
    setTab: browse.setTab,
    setModal: browse.setModal,
    setToast,
  });
  const detail = useArticleDetail(browse.modal, browse.selected?.id);
  const model = browseModel({
    specialty: browse.specialty,
    tab: browse.tab,
    query: browse.query,
    topic: browse.topic,
    type: browse.type,
    period: browse.period,
    guidelineYear: browse.guidelineYear,
    free: browse.free,
    sort: browse.sort,
    articles: browse.articles,
    saved: account.saved,
  });

  function openArticle(article: Article) {
    trackClinicalEvent("article_open", article.topic || "all", article.source || "PubMed");
    browse.setSelected(article);
    detail.prepareDetail();
    browse.setModal("detail");
  }

  function chooseTab(value: string) {
    if (value === "saved" && !account.user) {
      account.openAuth("login");
      return;
    }
    if (value === "collection") {
      browse.setQ("");
      browse.setQuery("");
      browse.setTopic("all");
      browse.setType("all");
      browse.setPeriod("all");
      browse.setFree(false);
      browse.setSort("recent");
    }
    if (value === "sbc") {
      browse.setQ("");
      browse.setQuery("");
      browse.setTopic("all");
      browse.setType("all");
      browse.setGuidelineYear("all");
    }
    browse.setTab(value);
    if (value !== "saved" && browse.tab !== "saved") browse.setPage(1);
    if (value !== "live" && value !== "saved") browse.setFree(false);
  }

  function showInitialCollection() {
    browse.setTab(model.hasClassics ? "collection" : model.hasBrazilianCatalog ? "sbc" : "live");
    browse.reset();
  }

  function clearResults() {
    browse.reset();
    if (browse.tab === "saved") browse.setTab(model.hasClassics ? "collection" : model.hasBrazilianCatalog ? "sbc" : "live");
  }

  function tryGuideExample() {
    browse.setQ("heart failure AND empagliflozin");
    browse.setQuery("heart failure AND empagliflozin");
    browse.reset();
    browse.setQ("heart failure AND empagliflozin");
    browse.setQuery("heart failure AND empagliflozin");
    browse.setTab("live");
    browse.setModal(null);
    setTimeout(scrollToExplore, 50);
  }

  return (
    <EditorialProvider>
      <SiteHeader
        user={account.user}
        onGuide={() => browse.setModal("guide")}
        onLibrary={() => {
          browse.setTab("saved");
          scrollToExplore();
        }}
        onProfile={account.openProfile}
        onLogin={() => account.openAuth("login")}
        onRegister={() => account.openAuth()}
      />
      <main id="inicio">
        <HeroSection q={browse.q} onQueryChange={browse.setQ} onSearch={browse.search} />
        <ExploreSection
          workspace={account.user ? <ReadingWorkspace key={account.user.id || account.user.email} account={account} browse={browse} onOpenArticle={openArticle} /> : null}
          browse={browse}
          model={model}
          saved={account.saved}
          saving={account.saving}
          onChooseTab={chooseTab}
          onOpenArticle={openArticle}
          onToggleSaved={account.toggleSaved}
          onShowInitialCollection={showInitialCollection}
          onClearResults={clearResults}
        />
        <FeaturesSection />
        <PlansSection signedIn={Boolean(account.user)} onAccount={() => (account.user ? account.openProfile() : account.openAuth())} />
        <JoinBanner signedIn={Boolean(account.user)} onAccount={() => (account.user ? account.openProfile() : account.openAuth())} />
      </main>
      <SiteFooter onGuide={() => browse.setModal("guide")} onPrivacy={() => browse.setModal("privacy")} />
      <AnalyticsConsent />
      {account.undoRemoval
        ? <Toast message={account.undoError || "Artigo removido da biblioteca."} onUndo={() => void account.restoreRemoved()} pending={account.undoBusy} onClose={account.dismissUndo} />
        : toast && <Toast message={toast} onClose={() => setToast("")} />}
      {browse.modal === "guide" && (
        <SearchGuide
          onClose={() => browse.setModal(null)}
          onExplore={() => {
            browse.setModal(null);
            scrollToExplore();
          }}
          onTryExample={tryGuideExample}
        />
      )}
      {browse.modal === "privacy" && <PrivacyNotice onClose={() => browse.setModal(null)} />}
      {browse.modal === "detail" && browse.selected && (
        <ArticleDetail
          article={browse.selected}
          abstract={detail.abstract}
          abstractLanguage={detail.abstractLanguage}
          abstractLoading={detail.abstractLoading}
          abstractError={detail.abstractError}
          saved={account.saved.some((item) => item.id === browse.selected?.id)}
          pending={account.saving === browse.selected.id}
          onClose={() => browse.setModal(null)}
          onToggle={account.toggleSaved}
        />
      )}
      {browse.modal === "auth" && <AuthModal account={account} onClose={() => browse.setModal(null)} />}
      {browse.modal === "profile" && account.user && (
        <ProfileModal account={account} email={account.user.email} onClose={() => browse.setModal(null)} />
      )}
    </EditorialProvider>
  );
}

