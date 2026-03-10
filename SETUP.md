# Instalacao e Execucao do Projeto

## Requisitos
- Node.js instalado
- PostgreSQL instalado ou banco hospedado no Render

## Instalar dependencias
Na raiz do projeto:

```bash
npm install
```

## Variaveis de ambiente
Crie um arquivo `server/.env` com pelo menos:

```env
DATABASE_URL=sua_url_do_banco
JWT_SECRET=sua_chave_jwt
PORT=3010
```

Opcional para recuperacao de senha por email:

```env
APP_BASE_URL=http://localhost:3010
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_USER=usuario_smtp
SMTP_PASS=senha_smtp
SMTP_FROM=Precificador SaaS <no-reply@seudominio.com>
```

## Rodar o servidor
Na raiz do projeto:

```bash
npm start
```

## Criar tabelas
Na raiz do projeto:

```bash
npm run migrate
```
