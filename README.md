# Precificador SaaS

SaaS de precificacao para pequenos vendedores com foco em cadastro de produtos, configuracao de taxas por marketplace e calculo de precos com base em margem e custos operacionais.

## Visao geral

O projeto usa um backend em Node.js + Express conectado ao PostgreSQL e um frontend em HTML, CSS e JavaScript servido pelo proprio backend. Hoje a aplicacao concentra autenticacao, produtos, marketplaces, taxas, analise de lucro e reprecificacao basica.

O cadastro de produtos tambem suporta:

- SKU manual ou automatico
- categorias de produto
- sugestao de NCM via autocomplete

## Stack

- Backend: Node.js + Express
- Banco: PostgreSQL
- Frontend: HTML + CSS + JavaScript
- Autenticacao: JWT
- Email: Nodemailer

## Estrutura de pastas

- `client/`: paginas e assets estaticos da interface
- `server/`: servidor, rotas, servicos, middleware e scripts de banco
- `docs/`: documentacao principal consolidada
- `docs/legado/`: documentos antigos preservados para referencia

## Como rodar o projeto

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar ambiente

Use `.env.example` como referencia e crie `server/.env` com pelo menos:

```env
DATABASE_URL=postgres://usuario:senha@localhost:5432/precificador
JWT_SECRET=sua_chave_jwt
PORT=3010
```

Variaveis opcionais para recuperacao de senha por email:

```env
APP_BASE_URL=http://localhost:3010
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_USER=usuario_smtp
SMTP_PASS=senha_smtp
SMTP_FROM=Precificador SaaS <no-reply@seudominio.com>
```

### 3. Aplicar migrations

```bash
npm run migrate:up
```

As migrations versionadas em `server/migrations/` sao a fonte oficial do schema e usam `DATABASE_URL` carregado do `.env`.

Os arquivos `server/sql/ensure_*.sql`, chamados pelo startup, existem apenas como compatibilidade temporaria para instalações antigas. Novas alterações de schema devem ser feitas exclusivamente por uma migration versionada.

O bootstrap historico foi arquivado em `server/legacy/createTable.js` e nao deve ser executado.

### Banco novo

Para provisionar um banco PostgreSQL totalmente vazio, use:

```bash
npm run db:bootstrap
```

O comando aplica o baseline oficial, registra como aplicadas as migrations ate `20260328100000_finalize-compras-fornecedor-schema` e executa somente as migrations posteriores. Ele exige `DATABASE_URL` em `server/.env`, permissoes para criar objetos e `pg_trgm`, e recusa qualquer banco que ja tenha tabelas do Zentry ou migrations registradas.

#### Teste isolado do bootstrap

1. No pgAdmin, crie manualmente um banco PostgreSQL vazio chamado `zentry_bootstrap_test`.
2. Copie `server/.env.bootstrap-test.example` para `server/.env.bootstrap-test`. Esse arquivo real e local nao e versionado.
3. Ajuste somente a `DATABASE_URL` do novo arquivo para apontar exclusivamente para `zentry_bootstrap_test`.
4. Execute o bootstrap informando o arquivo de ambiente de teste:

```bash
node server/scripts/bootstrapDatabase.js --env-file server/.env.bootstrap-test
```

Tambem e possivel usar `npm run db:bootstrap -- --env-file server/.env.bootstrap-test`. Sem `--env-file`, o comando continua usando `server/.env`.

Para bancos existentes, use somente `npm run migrate:up`.

### 4. Popular marketplaces padrao

```bash
npm run seed:marketplaces
```

### 5. Iniciar servidor

```bash
npm start
```

## Como rodar client e server

No estado atual do projeto, `client` e `server` nao sao iniciados separadamente:

- o frontend esta na pasta `client/`;
- o backend esta na pasta `server/`;
- ambos sao servidos por um unico processo ao executar `npm start`.

Depois de iniciar o servidor, acesse:

- `http://localhost:3010/` se `PORT=3010`

## Scripts

- `npm start`: inicia a aplicacao
- `npm run migrate:create -- nome_da_migration`: cria uma nova migration em `server/migrations/`
- `npm run migrate:up`: aplica migrations pendentes
- `npm run migrate:down`: faz rollback da migration mais recente quando ela suporta `down`
- `npm run db:bootstrap`: provisiona apenas banco novo e vazio pelo baseline oficial
- `npm run seed:marketplaces`: cadastra marketplaces padrao

## Migrations

Criar migration:

```bash
npm run migrate:create -- nome_da_migration
```

Aplicar migrations:

```bash
npm run migrate:up
```

Rollback:

```bash
npm run migrate:down
```

## Documentacao principal

A documentacao consolidada fica em `docs/`:

- `docs/arquitetura.md`
- `docs/banco-de-dados.md`
- `docs/regras-de-preco.md`
- `docs/roadmap.md`
- `docs/api.md`

Documentos historicos preservados ficam em `docs/legado/`.

## Observacoes

- Este passo reorganiza apenas a documentacao.
- Inconsistencias entre arquivos antigos e o estado atual do codigo foram registradas nos documentos, sem alterar regras de negocio.
