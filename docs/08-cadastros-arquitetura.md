# 📊 08 — ARQUITETURA DO MÓDULO CADASTROS

## 🔗 RELAÇÃO COM OUTROS DOCUMENTOS

Este módulo segue as diretrizes de:

- 03-principios-do-motor-de-regras.md
- 05-arquitetura-alvo.md
- 07-regras-para-o-codex.md

Nenhuma implementação pode violar esses documentos.

## 🎯 ESCOPO DO MÓDULO CADASTROS

O módulo de Cadastros deve implementar os seguintes itens:

- Contatos (Clientes, Fornecedores, Vendedores)
- Anúncios
- Embalagens
- Relatórios

---

## 🧱 MODELO DE DADOS (OBRIGATÓRIO)

### Entidade principal: Contatos

Existe apenas UM cadastro base: contatos.

Este cadastro será utilizado para:

- Clientes
- Fornecedores
- Vendedores

---

### Estrutura obrigatória

Tabela: contatos

- id
- nome
- fantasia
- tipo_pessoa (PF/PJ)
- documento
- email
- telefone

---

Tabela: tipos_contato

- id
- nome

---

Tabela: contato_tipos

- contato_id
- tipo_id

---

## 🎨 FRONTEND (PADRÃO OBRIGATÓRIO)

Cada módulo deve possuir:

- Página de listagem
- Campo de busca
- Botão "Adicionar"
- Tabela com scroll

O formulário de cadastro:

- Não deve abrir automaticamente
- Deve ser separado da listagem
- Deve permitir múltiplos tipos de contato

---

## ⚙️ BACKEND (PADRÃO OBRIGATÓRIO)

Rotas para contatos:

GET    /contatos  
POST   /contatos  
PUT    /contatos/:id  
DELETE /contatos/:id  

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

1. Criar estrutura de banco (contatos e tipos)
2. Implementar rotas backend
3. Implementar listagem frontend
4. Implementar formulário de cadastro
5. Integrar frontend com backend

---

## ❌ PROIBIDO

- Criar tabelas separadas de clientes, fornecedores ou vendedores
- Duplicar dados
- Alterar layout base existente

---

## 📌 DEFINIÇÃO DE CONCLUSÃO

O módulo estará concluído quando:

- for possível criar, editar, excluir e listar contatos
- for possível atribuir múltiplos tipos
- o sistema estiver consistente com os outros módulos