# 📦 09 — IMPLEMENTAÇÃO DO MÓDULO CONTATOS

## 🎯 OBJETIVO

Implementar o módulo de contatos (clientes e fornecedores) de forma simples, escalável e integrada ao sistema, seguindo a arquitetura atual do projeto.

Este módulo será base para:
- compras
- vendas futuras
- relatórios
- relacionamento com clientes e fornecedores

---

## 📌 ESCOPO

Este módulo inclui:

- API backend completa (CRUD)
- Integração com tabela única `contatos`
- Integração com autenticação via JWT (`usuario_id`)
- Estrutura preparada para frontend

---

## 🚫 REGRAS IMPORTANTES

- NÃO alterar tabelas existentes fora do escopo
- NÃO modificar autenticação
- NÃO alterar rotas existentes
- NÃO quebrar layout (sidebar, dashboard, etc)
- NÃO duplicar lógica já existente
- USAR `usuario_id` vindo do JWT
- Manter padrão do projeto

---

## 🧱 ARQUITETURA (OBRIGATÓRIO)

Seguir padrão em camadas:

- routes → define endpoints
- controller → trata request/response
- service → regra de negócio
- db/query → SQL

📌 Objetivo: organização, manutenção e escalabilidade

---

## 🧠 MODELAGEM

### 📌 Tabela: `contatos`

Campos:

- id (PK)
- nome (obrigatório)
- tipo (`cliente` | `fornecedor` | `ambos`)
- documento
- telefone
- email
- observacoes
- usuario_id (obrigatório)
- criado_em
- atualizado_em

📌 Regra:
Cada contato pertence a um usuário (multi-tenant)

---

## 🚀 ETAPA 1 — ROTAS

Criar arquivo:

server/routes/contatos.js

Endpoints:

- GET `/contatos`
- GET `/contatos/:id`
- POST `/contatos`
- PUT `/contatos/:id`
- DELETE `/contatos/:id`

---

## 🚀 ETAPA 2 — CONTROLLER

Criar:

server/controllers/contatosController.js

Responsabilidades:

- receber `req`
- validar dados
- extrair `usuario_id` do token
- chamar service
- retornar JSON padronizado

---

## 🚀 ETAPA 3 — SERVICE

Criar:

server/services/contatosService.js

Responsabilidades:

- regras de negócio
- validações adicionais
- chamadas ao banco
- garantir isolamento por `usuario_id`

---

## 🚀 ETAPA 4 — BANCO (QUERY)

### 📌 Criar tabela (se não existir)

```sql
CREATE TABLE IF NOT EXISTS contatos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cliente','fornecedor','ambos')),
  documento VARCHAR(50),
  telefone VARCHAR(50),
  email VARCHAR(255),
  observacoes TEXT,
  usuario_id INTEGER NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);