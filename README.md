# Precificador SaaS

SaaS de precificacao para marketplaces, com backend em Node.js + Express, banco PostgreSQL e frontend em HTML, CSS e JavaScript.

## Stack
- Backend: Node.js + Express
- Banco: PostgreSQL
- Autenticacao: JWT
- Frontend: HTML + CSS + JS

## Estrutura
- `client/` interface web
- `server/` backend e regras de negocio

## Como rodar
1. Instale as dependencias:

```bash
npm install
```

2. Configure `server/.env`.

Exemplo minimo:

```env
DATABASE_URL=sua_url_do_banco
JWT_SECRET=sua_chave_jwt
PORT=3010
```

3. Rode as migracoes:

```bash
npm run migrate
```

4. Inicie o projeto:

```bash
npm start
```

## Scripts
- `npm start` inicia o servidor
- `npm run migrate` executa a criacao/ajuste das tabelas
- `npm run seed:marketplaces` popula marketplaces padrao

## Estrategia de Branches

### `main`
Branch estavel de producao.

Use para:
- versoes prontas
- tags oficiais
- deploy

### `develop`
Branch de integracao de desenvolvimento.

Use para:
- consolidar features aprovadas
- testar integracao antes de promover para `main`

### `feature/*`
Branches de desenvolvimento de funcionalidades.

Exemplo:
- `feature/multi-marketplace`

Fluxo recomendado:
1. Crie uma branch a partir de `develop`
2. Desenvolva a funcionalidade
3. Envie para o GitHub
4. Abra PR para `develop`
5. Depois de validado, promova `develop` para `main`

## Convencao recomendada
- `main` = estavel
- `develop` = desenvolvimento integrado
- `feature/*` = novas funcionalidades
- `fix/*` = correcoes
- `hotfix/*` = correcoes urgentes em producao

## Versao atual
- Tag: `v1.0`

## Documentos auxiliares
- [SETUP.md](/c:/Users/cim_6/Desktop/precificador-saas/SETUP.md)
- [CHANGELOG.md](/c:/Users/cim_6/Desktop/precificador-saas/CHANGELOG.md)
