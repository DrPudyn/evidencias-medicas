export function GuideArticle({ lang }: { lang: "pt" | "en" }) {
  const en = lang === "en";
  const home = en ? "/en" : "/pt";
  const library = `${home}?search=1&tab=saved#explorar`;
  const explore = `${home}#explorar`;
  return (
    <main id="guia" className="guide-page container">
      <p className="eyebrow">{en ? "SEARCH GUIDE" : "GUIA DE BUSCA"}</p>
      <h1>{en ? "How to search without getting lost" : "Como buscar sem se perder"}</h1>
      <p>{en
        ? "A short guide to the clinical question, PubMed filters and the library. It does not replace reading the original paper."
        : "Um guia curto para a pergunta clínica, os filtros do PubMed e a biblioteca. Não substitui a leitura do artigo original."}</p>

      <section>
        <h2>{en ? "1. Write a simple PICO question" : "1. Formule a pergunta em PICO simples"}</h2>
        <ul>
          <li>{en ? "Patient or population: who is the question about?" : "Paciente ou população: de quem é a pergunta?"}</li>
          <li>{en ? "Intervention: which drug, test or action?" : "Intervenção: qual fármaco, exame ou conduta?"}</li>
          <li>{en ? "Comparison: placebo, usual care or another treatment, when the question has one." : "Comparação: placebo, cuidado habitual ou outro tratamento, quando a pergunta tiver."}</li>
          <li>{en ? "Outcome: hospitalization, death, symptoms, kidney function, and so on." : "Desfecho: internação, morte, sintomas, função renal, e assim por diante."}</li>
        </ul>
        <p>{en
          ? "Example: in adults with heart failure, does an SGLT2 inhibitor, compared with placebo, reduce hospitalization?"
          : "Exemplo: em adultos com insuficiência cardíaca, um iSGLT2, comparado a placebo, reduz internação?"}</p>
      </section>

      <section>
        <h2>{en ? "2. Examples of a useful search" : "2. Exemplos de buscas úteis"}</h2>
        <ul>
          <li><a href={`${explore.replace("#explorar", "")}?search=1&q=heart+failure+SGLT2&specialty=cardiology#explorar`}>heart failure SGLT2</a> — {en ? "cardiology, class and condition." : "cardiologia, classe e condição."}</li>
          <li><a href={`${home}?search=1&q=metformin+prediabetes&specialty=endocrinology#explorar`}>metformin prediabetes</a> — {en ? "endocrinology, drug and population." : "endocrinologia, fármaco e população."}</li>
          <li><a href={`${home}?search=1&specialty=cardiology&type=systematic#explorar`}>{en ? "Cardiology and systematic review, with no free-text term." : "Cardiologia e revisão sistemática, sem termo livre."}</a></li>
        </ul>
      </section>

      <section>
        <h2>{en ? "3. English terms and MeSH" : "3. Termos em inglês e MeSH"}</h2>
        <p>{en
          ? "PubMed indexes titles, abstracts and MeSH headings in English. “Insuficiência cardíaca” is heart failure; “diabetes tipo 2” is type 2 diabetes. A drug name is often the same in both languages. The direct article search looks at title, abstract and MeSH. The clinical question above it limits the synthesis to systematic reviews, meta-analyses and guidelines."
          : "O PubMed indexa título, resumo e descritores MeSH em inglês. “Insuficiência cardíaca” é heart failure; “diabetes tipo 2” é type 2 diabetes. O nome do fármaco costuma ser o mesmo. A busca de artigos olha título, resumo e MeSH. A pergunta clínica, na home, limita a síntese a revisões sistemáticas, metanálises e diretrizes."}</p>
      </section>

      <section>
        <h2>{en ? "4. Filters" : "4. Filtros"}</h2>
        <ul>
          <li>{en ? "Specialty narrows the topic, for example cardiology or endocrinology." : "Especialidade estreita o tema, por exemplo cardiologia ou endocrinologia."}</li>
          <li>{en ? "Study type: clinical trial, randomized trial, review, systematic review, meta-analysis or guideline." : "Tipo de estudo: ensaio clínico, ensaio randomizado, revisão, revisão sistemática, metanálise ou diretriz."}</li>
          <li>{en ? "Period: any date, 30 days, 12 months or 5 years." : "Período: qualquer data, 30 dias, 12 meses ou 5 anos."}</li>
          <li>{en ? "Free full text only shows records PubMed marks as free. It does not guarantee the PDF will open." : "Texto completo gratuito só mostra o que o PubMed marca como livre. Não garante que o PDF abra."}</li>
        </ul>
        <p><a href={explore}>{en ? "Open the article search" : "Abrir a busca de artigos"}</a></p>
      </section>

      <section>
        <h2>{en ? "5. How to read the study type" : "5. Como ler o tipo de estudo"}</h2>
        <ul>
          <li>{en ? "Systematic review: a planned search across studies, with explicit methods." : "Revisão sistemática: busca planejada de estudos, com método explícito."}</li>
          <li>{en ? "Meta-analysis: combines numerical results. It is only as reliable as the studies inside it." : "Metanálise: combina resultados numéricos. Vale o que valem os estudos que entram nela."}</li>
          <li>{en ? "Randomized trial: compares groups assigned by chance. One trial rarely settles a question." : "Ensaio randomizado: compara grupos sorteados. Um ensaio raramente encerra a pergunta."}</li>
          <li>{en ? "Guideline: a society’s recommendation. Check the year and whether it matches your patient." : "Diretriz: recomendação de uma sociedade. Confira o ano e se ela cabe no seu paciente."}</li>
        </ul>
        <p>{en
          ? "The label is the publication type, not a grade of certainty. Read the population, the comparison and the outcome in the original record."
          : "O rótulo é o tipo de publicação, não um grau de certeza. Leia população, comparação e desfecho no registro original."}</p>
      </section>

      <section>
        <h2>{en ? "6. Save to your library" : "6. Salvar na biblioteca"}</h2>
        <p>{en
          ? "Each result has a bookmark. If you are signed in, it is stored in your account and listed under My library, with a link to PubMed. If you are not signed in, the bookmark opens the sign-in page. Removing it uses the same button."
          : "Cada resultado tem um marcador. Com a conta aberta, o artigo fica gravado e aparece em Minha biblioteca, com link para o PubMed. Sem conta, o marcador abre a página de entrar. Tirar o artigo usa o mesmo botão."}</p>
        <p><a href={library}>{en ? "Open my library" : "Abrir minha biblioteca"}</a></p>
      </section>
    </main>
  );
}
