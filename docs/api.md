# API

## Visao geral

Base atual:

- frontend servido pelo mesmo backend;
- rotas protegidas exigem `Authorization: Bearer <token>`;
- nao existe prefixo global `/api` nas rotas de negocio.

Endpoint auxiliar:

- `GET /api` -> retorna mensagem simples de status.

## Autenticacao

### `POST /auth/register`

Cria usuario e retorna token JWT.

Body principal:

- `nome`
- `email`
- `senha`

### `POST /auth/login`

Autentica usuario.

Body principal:

- `email`
- `senha`

### `POST /auth/esqueci-senha`

Gera link de recuperacao.

Body principal:

- `email`

Observacao:

- quando SMTP nao esta configurado, o backend devolve `reset_link` na resposta.

### `POST /auth/resetar-senha`

Atualiza senha a partir de token de recuperacao.

Body principal:

- `token`
- `nova_senha`

## Marketplaces

Rotas protegidas.

### `GET /marketplaces`

Lista marketplaces cadastrados.

### `POST /marketplaces`

Cria marketplace.

Body principal:

- `nome`

## Taxas

Rotas protegidas.

### `GET /taxas`

Lista taxas do usuario autenticado.

### `POST /taxas`

Cria taxa para um marketplace.

Body principal:

- `marketplace_id`
- `taxa_percentual`
- `taxa_fixa`
- `frete_medio`
- `imposto_percentual`

### `PUT /taxas/:id`

Atualiza taxa existente.

### `DELETE /taxas/:id`

Remove taxa existente.

## Produtos

Rotas protegidas.

### `POST /produtos`

Cria produto.

Body principal observado:

- `nome`
- `sku` opcional
- `barcode`
- `ncm`
- `categoria_id` opcional
- `custo`
- `preco` ou `preco_venda`
- `quantidade`
- `estoque_min`
- `estoque_max`
- `localizacao`
- `descricao`
- `marketplace` (legado)
- `marketplaces` (array)
- `margem` ou `margem_desejada`

Observacoes:

- `nome` e `custo` sao obrigatorios;
- quando `sku` nao e enviado no cadastro, o backend gera automaticamente no formato `PROD-000001`;
- o backend salva relacoes em `produtos_marketplaces`;
- a precificacao do produto e recalculada no fluxo de criacao/edicao.

### `PUT /produtos/:id`

Atualiza produto.

### `GET /produtos`

Lista paginada de produtos.

Query params observados:

- `page`
- `limit`
- `busca`
- `categoria_id`

Resposta inclui:

- `produtos`
- `total`
- `page`
- `limit`
- `totalPages`

### `GET /produtos/buscar`

Busca sugestoes por nome, SKU, codigo de barras/EAN ou NCM.

Query params observados:

- `q`

### `GET /produtos/sugerir-sku`

Retorna um SKU sugerido para preenchimento automatico.

## Categorias

Rotas protegidas.

### `GET /categorias`

Lista categorias cadastradas com paginacao.

Query params observados:

- `page`
- `limit`
- `busca`

### `POST /categorias`

Cria categoria.

Body principal:

- `nome`
- `descricao` opcional

## NCM

Rotas protegidas.

### `GET /ncm/sugestoes`

Retorna sugestoes de NCM por codigo ou descricao.

Query params observados:

- `q`

### `POST /produtos/recalcular-precos`

Recalcula precificacao de todos os produtos do usuario.

### `POST /produtos/:id/recalcular-precos`

Recalcula precificacao de um produto especifico.

### `DELETE /produtos/:id`

Exclui produto do usuario autenticado.

## Calculo avulso

Rotas protegidas.

### `POST /calcular-preco`

Executa calculo com base em um marketplace do usuario.

Body principal:

- `custo`
- `marketplace`
- `margem`
- `lucro_minimo` opcional

## Analise

Rotas protegidas.

### `GET /analise/dashboard`

Retorna resumo com:

- total de produtos;
- margem media;
- lucro estimado;
- total de marketplaces configurados;
- ultimos indicadores;
- produtos com margem negativa.

### `GET /analise/lucro`

Lista paginada para analise de lucro.

Query params observados:

- `page`
- `limit`

## Inconsistencias documentadas

- O endpoint de status usa `/api`, mas as rotas de negocio nao usam esse prefixo.
- Parte da documentacao antiga citava apenas `GET /produtos`, sem refletir o conjunto atual de autenticacao, taxas, marketplaces, analise e reprecificacao.
