# Roadmap

## Estado atual observado

O sistema atual ja possui:

- autenticacao com JWT;
- cadastro e login;
- recuperacao de senha;
- cadastro de produtos;
- associacao de produtos a varios marketplaces;
- cadastro de marketplaces;
- cadastro de taxas por marketplace;
- recalculo de precos;
- dashboard resumido.

## Roadmap consolidado

### Curto prazo

- estabilizar e detalhar a documentacao tecnica;
- manter listagens paginadas e revisar consultas de maior uso;
- consolidar convencoes de schema e nomenclatura entre legado e implementacao atual.

### Medio prazo

- importacao de XML de nota fiscal;
- busca e filtros mais avancados na listagem de produtos;
- ampliar analises de lucro e margem;
- melhorar observabilidade operacional do backend.

### Longo prazo

- integracao com marketplaces como Mercado Livre e Shopee;
- automacao mais avancada de repricing;
- evolucao de estoque e operacao multicanal;
- relatorios e camadas adicionais de permissao/usuarios.

## Fontes consolidadas

Este roadmap foi montado a partir de:

- `TASKS.md`
- `DEV_PLAN.md`
- `CHANGELOG.md`
- `visao estrategica.rtf`

## Inconsistencias documentadas

- O roadmap legado mais antigo (`DEV_PLAN.md`) e muito resumido e nao cobre autenticacao, dashboard nem estrutura multicanal que ja existem.
- A visao estrategica descreve um produto mais amplo do que o escopo atualmente implementado.
