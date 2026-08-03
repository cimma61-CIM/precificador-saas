# Migrations legadas

## 20260322_create_contatos.js
Status: não utilizada.

Motivo:
Foi criada uma segunda modelagem de contatos usando coluna "tipo" diretamente.
O banco oficial utiliza a migration 20260322150000_create_contatos.js.

## 20260327120000_add-fornecedor-id-to-compras.js
Status: substituída.

Motivo:
A migration esperava a existência da coluna contato_id em compras.
O banco atual já utiliza fornecedor_id diretamente.

Foi substituída pela:
20260328100000_finalize-compras-fornecedor-schema.js

## server/legacy/createTable.js
Status: legado.

Motivo:
Representa um caminho antigo de criação de schema.
O projeto atual utiliza migrations como fonte oficial do schema; os arquivos ensure sao apenas compatibilidade temporaria de startup.

Nao deve ser executado: o arquivo pode conter estruturas que nao correspondem ao schema atual.
