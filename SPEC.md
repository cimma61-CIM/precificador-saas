# Especificação do Sistema

Sistema SaaS de precificação de produtos.

## Cadastro de produtos

Campos:

- nome
- custo
- preco_venda
- estoque

## Listagem de produtos

A listagem deve:

- usar paginação
- permitir busca por nome

Endpoint:

GET /produtos

## Banco de dados

Tabela produtos:

id
nome
custo
preco_venda
estoque