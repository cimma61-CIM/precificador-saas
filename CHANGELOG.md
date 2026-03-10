# Changelog

## v1.0 - 2026-03-10

### Adicionado
- Autenticacao com JWT e fluxo de cadastro/login.
- Recuperacao de senha com geracao de token e paginas de redefinicao.
- Cadastro e gestao de marketplaces.
- CRUD de taxas por marketplace.
- Dashboard com indicadores principais do SaaS.
- Seed inicial de marketplaces padrao.
- Preparacao do projeto para deploy no Render e PM2.

### Produtos e Precificacao
- Cadastro de produtos com multiplos marketplaces.
- Tabela `produtos_marketplaces` para margens e precos por canal.
- Preco de venda direto separado da precificacao de marketplaces.
- Recálculo em lote de precos.
- Recálculo individual por produto.
- Edicao de produto com margens por marketplace.
- Edicao inline de margens na tabela.
- Status visual por marketplace:
  - Calculado
  - Sem taxa
  - Margem invalida
- Autosave, Enter para salvar e destaque visual de atualizacao.
- Autocomplete no campo de nome do produto.

### Frontend
- Sidebar e layout mais consistentes.
- Cards no dashboard.
- Tabelas com visual modernizado.
- Formularios mais organizados e responsivos.
- Paginas para:
  - produtos
  - taxas
  - marketplaces
  - resumo/dashboard
  - esqueci senha
  - resetar senha

### Infraestrutura
- Uso centralizado de dependencias pela raiz do projeto.
- `.env.example` criado.
- `.gitignore` ajustado.
- Scripts de start, migrate e seed padronizados.
