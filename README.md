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

As migrations versionadas ficam em `server/migrations/` e usam `DATABASE_URL` carregado do `.env`.

Para compatibilidade, o script legado continua disponivel:

```bash
npm run migrate:legacy
```

Esse fluxo legado ainda existe enquanto a transicao para migrations versionadas e consolidada.

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
- `npm run migrate`: abre o runner de migrations versionadas
- `npm run migrate:create -- nome_da_migration`: cria uma nova migration em `server/migrations/`
- `npm run migrate:up`: aplica migrations pendentes
- `npm run migrate:down`: faz rollback da migration mais recente quando ela suporta `down`
- `npm run migrate:legacy`: executa o bootstrap acumulado antigo em `server/createTable.js`
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
