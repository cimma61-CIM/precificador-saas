# Instalação e Execução do Projeto

## Requisitos
- Node.js instalado
- PostgreSQL instalado ou banco hospedado no Render
- VS Code

## Instalar dependências

### Na raiz do projeto
npm install

### Dentro da pasta server
npm install

## Variáveis de ambiente
Criar um arquivo .env dentro da pasta server com a variável:

DATABASE_URL=sua_url_do_banco

## Rodar o servidor
Dentro da pasta server:
node server.js

ou, se existir script start:
npm start

## Criar tabelas
Se existir arquivo createTable.js:
node createTable.js