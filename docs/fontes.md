# Fontes de dados — o que existe e desde quando

Medido pela sonda (`scripts/sonda.mjs`) em 28/10/2026, rodando no GitHub Actions.

## Câmara dos Deputados — arquivos anuais em lote (CSV, `;`, UTF-8 com BOM)

`https://dadosabertos.camara.leg.br/arquivos/{nome}/csv/{nome}-{ano}.csv`

| Arquivo | Anos disponíveis | Uso no Na Conta |
| --- | --- | --- |
| `votacoesVotos` | 2001–2026 | Voto de cada deputado (o histórico individual começa aqui) |
| `votacoes` | 1935–2026 (com lacunas) | Data, descrição e resultado da votação |
| `votacoesOrientacoes` | 2003–2026 | Orientação de cada partido/bloco |
| `votacoesProposicoes` | 1974–2026 | Qual proposição cada votação afetou |
| `proposicoes` | 1934–2026 | Proposições (o robô guarda PL, PLP, PEC, PDL, PRC, MPV, PLV) |
| `proposicoesAutores` | 1934–2026 | Autores e coautores |
| `deputados.csv` (único) | — | Só `uri` e `nomeCivil`. **Traz CPF: o robô nunca lê essa coluna.** |
| Cota parlamentar `Ano-{ano}.csv.zip` | 2008–2026 | Gastos de gabinete (etapa 4) |

Votos possíveis: `Sim`, `Não`, `Abstenção`, `Obstrução`, `Artigo 17` (presidente da sessão → "outro").

## Senado Federal — `https://legis.senado.leg.br/dadosabertos`

| Serviço | Cobertura | Observação |
| --- | --- | --- |
| `/votacao?dataInicio=&dataFim=` | 1991–2026 | Serviço novo. O antigo `/plenario/lista/votacao` foi desativado em 01/02/2026 |
| `/senador/lista/atual.json` | Atual | Partido, UF, foto |
| `/senador/lista/legislatura/{n}.json` | Por legislatura | Inclui suplentes que exerceram mandato |

Votos possíveis: `Sim`, `Não`, `Abstenção`, `NCom` (não compareceu → "ausente"), `P-NRV` (presente, não registrou voto), `AP` (atividade parlamentar), `MIS` (missão), `LS` (licença saúde), `Presidente (art. 51 RISF)`. Ausências justificadas viram "outro" e o texto original fica em `votos.voto_original`.

Atenção: a consulta de 2015 inteira devolveu só 17 votações — conferir mês a mês antes de publicar o histórico desse ano.

## Portal da Transparência (CGU)

Exige token pessoal gov.br (`chave-api-dados`). Sem token, responde HTTP 401. Entra na etapa 4.

## Regra de exibição

Período sem dado digital aparece como "Sem registro digital antes de [ano]", nunca como "não votou".
