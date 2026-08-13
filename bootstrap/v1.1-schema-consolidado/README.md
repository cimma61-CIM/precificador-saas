# Bootstrap oficial — v1.1-schema-consolidado

Este pacote provisiona apenas um PostgreSQL vazio. Ele representa o schema final da tag `v1.1-schema-consolidado`, encerra no cutover `20260328100000_finalize-compras-fornecedor-schema` e nao inclui `pgmigrations`.

## Uso

- Banco novo: `npm run db:bootstrap`.
- Banco existente: somente `npm run migrate:up`.
- Verificar fonte oficial sem alterar `ncm`: `npm run ncm:check`.
- Verificar usando ambiente isolado: `npm run ncm:check -- --env-file server/.env.bootstrap-test`.
- Aplicar catalogo ja revisado: `npm run ncm:update -- --catalog-dir bootstrap/v1.1-schema-consolidado/reference-data/ncm`.
- Aplicar usando ambiente isolado: `npm run ncm:update -- --catalog-dir bootstrap/v1.1-schema-consolidado/reference-data/ncm --env-file server/.env.bootstrap-test`.

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

O catalogo NCM e dado de referencia separado do baseline historico. Cada atualizacao deve criar um novo diretorio versionado, preservar a resposta oficial, registrar origem/vigencia/hash e aplicar alteracoes somente na tabela de referencia `ncm`. O SQL de referencia e gerado diretamente do `source.json` em UTF-8, preservando fielmente as descricoes oficiais. Ela nao deve reescrever este baseline nem alterar dados operacionais.

`ncm:check` registra a verificacao e seu relatorio de diferencas, mas nao insere, atualiza ou remove codigos NCM. `ncm:update` so aceita um `manifest.json` com `review.status: "approved"`, data e responsavel pela revisao. A aplicacao compara codigos pela chave normalizada de oito digitos, preserva o formato pontuado do catalogo para novos registros, atualiza descricoes de codigos equivalentes e nunca remove codigos que tenham deixado de vigorar. Seu relatorio informa `inserted` e `updated` separadamente. Ambos aceitam opcionalmente `--env-file <caminho>`; sem a opcao usam `server/.env`, e o caminho deve permanecer dentro do projeto. Nenhum desses comandos e chamado pelo startup.

## Alerta administrativo NCM

Defina `NCM_ADMIN_EMAILS` em `server/.env` com uma lista de emails separada por virgula. Esses usuarios veem no dashboard um alerta quando a ultima verificacao bem-sucedida tiver mais de 30 dias. O alerta nao atualiza catalogo nem dispara comandos automaticamente.
