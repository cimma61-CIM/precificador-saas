# Banco de Dados

## Tecnologia

- PostgreSQL

## Origem do schema atual

As migrations versionadas em `server/migrations/`, aplicadas por `npm run migrate:up`, sao a fonte oficial e versionada do schema.

Os arquivos `server/sql/ensure_*.sql` ainda sao chamados no startup somente para compatibilidade temporaria com instalações antigas. Eles nao substituem migrations e qualquer alteração estrutural nova deve ser entregue em uma migration.

O bootstrap acumulado anterior esta arquivado em `server/legacy/createTable.js` apenas para consulta historica. Ele nao faz parte do startup e nao possui comando de execucao.

## Tabelas principais

### `usuarios`

Finalidade:

- cadastro de conta;
- autenticacao;
- recuperacao de senha;
- definicao basica de plano.

Campos relevantes:

- `id`
- `nome`
- `email`
- `senha_hash`
- `reset_token`
- `reset_token_expira`
- `plano`
- `criado_em`

### `marketplaces`

Finalidade:

- catalogo de marketplaces disponiveis para taxas e produtos.

Campos relevantes:

- `id`
- `nome`
- `slug`
- `criado_em`

Observacoes:

- `slug` e unico;
- ha normalizacao de nome/slug durante a migracao.

### `produtos`

Finalidade:

- cadastro principal de produtos por usuario;
- armazenamento do preco direto e metadados de estoque simples.

Campos relevantes:

- `id`
- `usuario_id`
- `nome`
- `barcode`
- `ncm`
- `custo`
- `preco`
- `preco_venda`
- `quantidade`
- `estoque_min`
- `estoque_max`
- `localizacao`
- `descricao`
- `marketplace`
- `margem`
- `margem_desejada`
- `criado_em`

Observacoes:

- `preco` e `preco_venda` hoje sao mantidos com o mesmo valor no fluxo principal de cadastro;
- `marketplace` e um campo legado/resumido, coexistindo com a tabela relacional `produtos_marketplaces`.

### `produtos_marketplaces`

Finalidade:

- relacionar um produto a varios marketplaces;
- guardar margem por canal;
- guardar preco calculado por marketplace.

Campos relevantes:

- `id`
- `produto_id`
- `marketplace_id`
- `usuario_id`
- `margem`
- `preco_calculado`
- `criado_em`

Observacoes:

- existe indice unico para `produto_id + marketplace_id`;
- esta tabela sustenta a precificacao multicanal.

### `taxas_marketplace`

Finalidade:

- guardar taxas configuradas por usuario para cada marketplace.

Campos relevantes:

- `id`
- `usuario_id`
- `marketplace`
- `marketplace_id`
- `taxa_percentual`
- `taxa_fixa`
- `frete_medio`
- `imposto_percentual`
- `criado_em`

Observacoes:

- existe indice unico para `usuario_id + marketplace_id`;
- o campo textual `marketplace` ainda existe por compatibilidade legada.

## Relacionamentos

- `produtos.usuario_id -> usuarios.id`
- `produtos_marketplaces.produto_id -> produtos.id`
- `produtos_marketplaces.marketplace_id -> marketplaces.id`
- `produtos_marketplaces.usuario_id -> usuarios.id`
- `taxas_marketplace.usuario_id -> usuarios.id`
- `taxas_marketplace.marketplace_id -> marketplaces.id`

## Indices observados

### Em `produtos`

- `idx_produtos_usuario_id`
- `idx_produtos_usuario_nome`
- `idx_produtos_usuario_marketplace`

### Em `produtos_marketplaces`

- `idx_produtos_marketplaces_usuario_produto`
- `idx_produtos_marketplaces_marketplace`
- `idx_produtos_marketplaces_unique`

### Em `taxas_marketplace`

- `idx_taxas_marketplace_usuario_id`
- `idx_taxas_marketplace_marketplace_id`
- `idx_taxas_marketplace_usuario_marketplace_id_unique`

## Consideracoes de escala

As regras do projeto indicam suporte de ate 15.000 produtos. O schema atual ja contempla alguns pontos importantes para esse volume:

- listagens paginadas com `LIMIT + OFFSET`;
- filtros por `usuario_id`;
- indice por `usuario_id` e nome em produtos;
- separacao de precificacao por tabela relacional.

## Inconsistencias documentadas

- O diagrama legado menciona tabelas como `variacoes`, `kit_itens` e `precificacao`, mas essas tabelas nao existem no banco atual.
- Parte da documentacao antiga usa o nome `USERS` ou `user_id`, enquanto o schema implementado usa `usuarios` e `usuario_id`.
