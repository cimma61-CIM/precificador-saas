# Arquitetura

## Visao geral

O Precificador SaaS e uma aplicacao monolitica em Node.js com backend em Express, banco PostgreSQL e frontend estatico em HTML, CSS e JavaScript.

Hoje o projeto roda com um unico processo Node.js que:

- expõe as rotas HTTP do backend;
- serve os arquivos estaticos da pasta `client/`;
- conecta no PostgreSQL para autenticacao, cadastro e precificacao.

## Componentes principais

### Backend

Local: `server/`

Responsabilidades atuais:

- inicializacao do servidor em `server/server.js`;
- carregamento de variaveis de ambiente em `server/config/loadEnv.js`;
- conexao com banco em `server/db.js`;
- autenticacao JWT;
- rotas de produtos, marketplaces, taxas, calculo e analise;
- servicos de precificacao e envio de email.

### Frontend

Local: `client/`

Responsabilidades atuais:

- paginas de login e cadastro;
- dashboard e resumo;
- gestao de produtos;
- gestao de marketplaces;
- gestao de taxas por marketplace;
- fluxo de recuperacao de senha.

O frontend e servido diretamente pelo Express via `express.static`.

### Banco de dados

Local de migracao manual atual: `server/createTable.js`

Responsabilidades atuais:

- criacao e ajuste incremental das tabelas;
- compatibilidade com estruturas legadas;
- criacao de indices para listagem e relacionamento;
- normalizacao de marketplaces existentes.

## Fluxo geral

1. O usuario acessa a interface em `client/`.
2. O frontend autentica via rotas de `auth`.
3. O token JWT e enviado nas rotas protegidas.
4. O backend le e grava dados no PostgreSQL.
5. A precificacao usa taxas por marketplace para calcular preco sugerido e margem real.

## Estrutura atual resumida

- `client/`: interface web estatica
- `server/routes/`: endpoints HTTP
- `server/services/`: regras reutilizaveis de precificacao e email
- `server/middleware/`: middleware de autenticacao
- `server/config/`: bootstrap de ambiente

## Decisoes observadas no estado atual

- O projeto nao possui separacao entre app API e app frontend; ambos sao entregues pelo mesmo servidor.
- O frontend consome rotas sem prefixo global `/api`; apenas a rota `GET /api` funciona como endpoint simples de verificacao.
- O script `server/createTable.js` funciona como migracao acumulada e tambem carrega ajustes de compatibilidade.

## Inconsistencias documentadas

- Parte da documentacao antiga descreve um sistema menor, focado apenas em `produtos`.
- O diagrama legado de banco sugere tabelas como `variacoes`, `kit_itens` e `precificacao`, que nao estao implementadas no schema atual.
- A documentacao estrategica legada cita modulos futuros como XML, estoque separado e repricing por concorrencia, mas esses pontos ainda nao aparecem completos no codigo atual.
