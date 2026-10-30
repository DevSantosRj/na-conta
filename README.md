# Na Conta

**O Brasil na ponta do lápis.** Votos, proposições, gastos, emendas e impostos de deputados e senadores, estado por estado, com a fonte oficial ao lado de cada número.

Mostramos o dado bruto, a fonte e o método. A conclusão é de quem lê.

## Situação

Em construção — etapas 1 a 5 de 6 concluídas; etapa 6 (lançamento) em andamento.

| Etapa | O que entra |
| --- | --- |
| 1 | Projeto no ar num link de teste |
| 2 | Banco, primeiros dados e login |
| 3 | Perfil do parlamentar e alertas por e-mail |
| 4 | Mapa, estados, emendas, Constituição e Meu imposto |
| 5 | Erros, segurança e velocidade |
| 6 | Lançamento |

## Fontes de dados

Somente fontes oficiais e abertas: Câmara dos Deputados, Senado Federal, Portal da Transparência (CGU), Tesouro Nacional (Siconfi), Receita Federal, IBGE, PNUD e o texto da Constituição publicado pelo Planalto.

## Tecnologia

Next.js na Vercel · Postgres no Supabase · robôs de coleta no GitHub Actions · e-mail pelo Resend.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha só o que a etapa atual usa
npm run dev
```

Abra http://localhost:3000.

## Créditos

Mapa base: [svg-maps/brazil](https://github.com/VictorCazanave/svg-maps), de Victor Cazanave, licença CC BY 4.0.

## Contato

Um projeto de DevSantos — [@DEVSANTOSRJ](https://x.com/DEVSANTOSRJ) no X. Segurança: veja [SECURITY.md](SECURITY.md).
