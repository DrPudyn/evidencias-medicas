# Catálogos de sociedades médicas

Seleção local de 225 documentos: 32 SBC, 17 SBEM e 176 novos documentos com texto integral gratuito conferido em 27/10/2026. São 55 especialidades, 54 sociedades e 39 especialidades com documentos; contagens por especialidade incluem documentos conjuntos.

## Critérios e proveniência

- Os novos registros do PubMed têm texto integral no PMC, conferido pela E-utility `efetch` da NCBI para a base `pmc`, incluindo corpo do artigo e data de publicação até 27/10/2026. A atribuição exige sociedade identificada no título, ou confirmação explícita no texto para a seleção manual. Editoriais, cartas, erratas, estudos sobre adesão a diretrizes e documentos de veterinária foram excluídos.
- PDFs dos portais SBGM, ANAMT e SBMN tiveram conteúdo, autoria e ano de elaboração/publicação conferidos no próprio arquivo. O ano da pasta de upload não foi usado como ano do documento. Minuta de consulta pública e documento revogado da ANAMT foram excluídos.
- Os oito posicionamentos recentes da Femina/FEBRASGO tiveram página, data e PDF abertos conferidos. Os títulos originais e o idioma dos registros são preservados.
- A seleção não representa um acervo completo nem certifica vigência clínica. Documentos anteriores a 2020 recebem indicação de histórico; podem existir atualizações posteriores em qualquer ano.
- SBC e SBEM preservam os registros e a proveniência legados. Datas de acesso ausentes continuam ausentes; a ampliação não atribui conferência nova a esses 49 itens.
- Somente metadados e links são incorporados. Os textos integrais continuam nos publicadores. Materiais restritos a associados não receberam indicação de acesso livre.
- `societies.json` tem IDs próprios por entidade, evitando colisões de SBCM, SBCP, SBN e SBP. O diretório oficial do CMBA identifica as sociedades filiadas à AMB; os documentos indicam sua autoria real, inclusive quando o site que hospeda o PDF pertence a outra sociedade.

## Cobertura

| Especialidade | Sociedade | Documentos |
| --- | --- | ---: |
| Acupuntura | CMBA | 0 |
| Alergia e Imunologia | ASBAI | 4 |
| Anestesiologia | SBA | 6 |
| Angiologia | SBACV | 8 |
| Cardiologia | SBC | 32 |
| Cirurgia Cardiovascular | SBCCV | 1 |
| Cirurgia da Mão | SBCM | 0 |
| Cirurgia de Cabeça e Pescoço | SBCCP | 1 |
| Cirurgia do Aparelho Digestivo | CBCD | 3 |
| Cirurgia Geral | CBC | 0 |
| Cirurgia Oncológica | SBCO | 4 |
| Cirurgia Pediátrica | CIPE | 0 |
| Cirurgia Plástica | SBCP | 0 |
| Cirurgia Torácica | SBCT | 1 |
| Cirurgia Vascular | SBACV | 8 |
| Clínica Médica | SBCM | 0 |
| Coloproctologia | SBCP | 0 |
| Dermatologia | SBD | 17 |
| Endocrinologia e Metabologia | SBEM | 17 |
| Endoscopia | SOBED | 1 |
| Gastroenterologia | FBG | 2 |
| Genética Médica | SBGM | 6 |
| Geriatria | SBGG | 0 |
| Ginecologia e Obstetrícia | FEBRASGO | 14 |
| Hematologia e Hemoterapia | ABHH | 19 |
| Homeopatia | AMHB | 0 |
| Infectologia | SBI | 4 |
| Mastologia | SBM | 2 |
| Medicina de Emergência | ABRAMEDE | 1 |
| Medicina de Família e Comunidade | SBMFC | 3 |
| Medicina do Trabalho | ANAMT | 6 |
| Medicina do Tráfego | ABRAMET | 0 |
| Medicina Esportiva | SBMEE | 2 |
| Medicina Física e Reabilitação | ABMFR | 0 |
| Medicina Intensiva | AMIB | 1 |
| Medicina Legal e Perícia Médica | ABMLPM | 0 |
| Medicina Nuclear | SBMN | 1 |
| Medicina Preventiva e Social | ABRAMPAS | 0 |
| Nefrologia | SBN | 15 |
| Neurocirurgia | SBN | 0 |
| Neurologia | ABN | 18 |
| Nutrologia | ABRAN | 0 |
| Oftalmologia | CBO | 1 |
| Oncologia Clínica | SBOC | 2 |
| Ortopedia e Traumatologia | SBOT | 0 |
| Otorrinolaringologia | ABORL-CCF | 1 |
| Patologia | SBP | 1 |
| Patologia Clínica/Medicina Laboratorial | SBPC/ML | 5 |
| Pediatria | SBP | 3 |
| Pneumologia | SBPT | 14 |
| Psiquiatria | ABP | 9 |
| Radiologia e Diagnóstico por Imagem | CBR | 3 |
| Radioterapia | SBRT | 2 |
| Reumatologia | SBR | 8 |
| Urologia | SBU | 5 |

Zero significa ausência de item conferido nesta seleção, e não inexistência de material no site da sociedade.

## Manutenção e testes

Novos itens precisam passar pelo schema e identificar entidades cadastradas. O ID deve ser estável e único; documentos conjuntos usam `societyIds` e mantêm uma sociedade principal na proveniência. A biblioteca grava os metadados canônicos do servidor.

`node scripts/catalog-smoke.mjs` valida o schema e a proveniência. `node scripts/catalog-browse-smoke.mjs` confere cobertura, separação entre sociedades, temas acessíveis, busca, filtros e conversão para favoritos. `node scripts/smoke-ci.mjs` testa os favoritos na aplicação compilada com banco local e sem acesso externo.

## Fontes

- [Diretório das sociedades filiadas à AMB — CMBA](https://cmba.org.br/sociedades-de-especialidades-filiadas-a-amb/)
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/) e [PubMed Central](https://pmc.ncbi.nlm.nih.gov/)
- [Diretrizes SBGM](https://www.sbgm.org.br/diretrizes.aspx)
- [Diretrizes ANAMT](https://www.anamt.org.br/portal/diretrizes/)
- [SBMN](https://sbmn.org.br/)
- [Posicionamentos FEBRASGO — Femina](https://femina.org.br/article-section/febrasgo-position-statement-pt-br/)

Os links individuais e as datas de consulta constam da proveniência de cada registro em `additional.json`.
