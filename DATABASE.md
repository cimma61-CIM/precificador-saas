# Banco de Dados

Banco utilizado: PostgreSQL

## Tabela principal: produtos

Campos esperados:

- id: identificador único do produto
- nome: nome do produto
- custo: custo do produto
- preco_venda: preço de venda do produto
- estoque: quantidade em estoque

## Observações
- A tabela produtos é a base principal do sistema.
- O backend se conecta ao PostgreSQL usando a variável DATABASE_URL no arquivo .env.
- Futuramente podem existir outras tabelas, como usuarios, vendas, categorias e importacoes_xml.