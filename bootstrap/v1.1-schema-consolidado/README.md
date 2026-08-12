# Bootstrap oficial — v1.1-schema-consolidado

Este pacote provisiona apenas um PostgreSQL vazio. Ele representa o schema final da tag `v1.1-schema-consolidado`, encerra no cutover `20260328100000_finalize-compras-fornecedor-schema` e nao inclui `pgmigrations`.

## Uso

- Banco novo: `npm run db:bootstrap`.
- Banco existente: somente `npm run migrate:up`.

Pre-requisitos: `DATABASE_URL` em `server/.env`, permissao para criar schema/objetos e permissao para instalar `pg_trgm` quando a extensao ainda nao existir. O comando recusa bancos com tabelas de negocio ou historico de migrations e nunca tenta limpar um banco.

`server/legacy/createTable.js` e somente uma referencia historica. Ele nao deve ser executado: misturava DDL com normalizacao, deduplicacao e migracao de dados legados.

## Rastreabilidade curta

| Objeto | Origem na tag |
| --- | --- |
| usuarios, ncm, marketplaces, produtos, produtos_marketplaces, taxas_marketplace | `server/createTable.js` |
| contatos e tipos | `server/migrations/20260322150000_create_contatos.js` |
| historico, compras e produto_fornecedor | `server/sql/ensure_*.sql` |
| fornecedor de compras | `20260328100000_finalize-compras-fornecedor-schema.js` |
| pg_trgm | `20260316183000_produtos-nome-trgm.js` |

## Politica NCM

O catalogo NCM e dado de referencia separado do baseline historico. Cada atualizacao deve criar um novo diretorio versionado, preservar a resposta oficial, registrar origem/vigencia/hash e aplicar alteracoes somente na tabela de referencia `ncm`. Ela nao deve reescrever este baseline nem alterar dados operacionais.
