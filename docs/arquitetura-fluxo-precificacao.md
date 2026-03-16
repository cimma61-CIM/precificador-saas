# Arquitetura do Fluxo de Precificacao

## Objetivo do documento

Documentar a arquitetura atual do fluxo de precificacao do projeto `precificador-saas`, mostrando onde cada responsabilidade esta localizada e como a execucao percorre frontend, rotas, services, calculadora e banco de dados.

Este documento descreve o estado atual e tambem registra a direcao arquitetural futura para a introducao do motor de regras, mantendo coerencia com os documentos ja existentes em `docs/`.

## Visao geral do fluxo atual

Hoje o sistema opera como um calculador parametrizado por marketplace.

O fluxo atual pode ser resumido assim:

`Frontend -> Rotas HTTP -> precificacaoService -> precoService -> PostgreSQL`

Na pratica, parte das rotas tambem consulta diretamente o banco e a calculadora, mas a separacao conceitual principal do fluxo de precificacao e:

- o frontend dispara a operacao
- as rotas recebem a requisicao HTTP
- `precificacaoService` organiza o recalculo operacional
- `precoService` executa a matematica da precificacao
- o PostgreSQL fornece e persiste os dados de produto, marketplace e taxa

## Camadas e responsabilidades

### Frontend

Local principal:

- `client/produtos.js`
- `client/resumo.js`
- `client/js/taxas.js`

Responsabilidades no fluxo atual:

- coletar custo, margens e marketplaces informados pelo usuario
- acionar endpoints de cadastro, simulacao e reprecificacao
- exibir preco calculado, lucro estimado e margem real

O frontend nao deve ser tratado como fonte oficial da regra de negocio da precificacao. A decisao principal continua no backend.

### Rotas HTTP

Arquivos principais:

- `server/routes/produtos.js`
- `server/routes/calculoRoutes.js`
- `server/routes/taxasRoutes.js`

Responsabilidades no fluxo atual:

- receber a requisicao HTTP
- validar entrada basica
- converter dados da requisicao para o formato esperado pelos services
- iniciar salvamento, consulta ou reprecificacao
- devolver o resultado para o frontend

No fluxo atual, as rotas ainda acumulam parte da leitura e persistencia operacional, mas nao devem concentrar a formula matematica principal.

### `precificacaoService`

Arquivo principal:

- `server/services/precificacaoService.js`

Responsabilidades no fluxo atual:

- executar o fluxo de reprecificacao operacional
- carregar produtos e taxas necessarias para o recalculo
- iterar pelos relacionamentos produto-marketplace
- reutilizar a calculadora central
- traduzir o resultado da calculadora para o formato persistido pelo sistema
- atualizar `produtos_marketplaces.preco_calculado`

Essa camada funciona como servico de orquestracao do fluxo atual de reprecificacao, ainda sem ser um orquestrador de contexto completo como o planejado para a arquitetura futura.

### `precoService`

Arquivo principal:

- `server/services/precoService.js`

Responsabilidades no fluxo atual:

- normalizar percentuais e valores monetarios
- calcular indice extra percentual
- buscar taxa por marketplace para calculos avulsos
- executar a formula matematica de precificacao

Essa camada representa a calculadora central do sistema atual e deve permanecer pura do ponto de vista de decisao de negocio: recebe parametros prontos e devolve resultado numerico.

### PostgreSQL

Estruturas principais envolvidas:

- `produtos`
- `marketplaces`
- `taxas_marketplace`
- `produtos_marketplaces`

Responsabilidades no fluxo atual:

- armazenar custo do produto
- armazenar taxa e custos contextuais por marketplace
- armazenar vinculo entre produto e marketplace
- persistir `preco_calculado` por canal

O banco fornece os insumos do calculo e recebe o resultado operacional da reprecificacao.

## Diagrama ASCII da arquitetura atual

```text
+---------------------------+
| Frontend                  |
| client/*.js               |
| produtos, taxas, resumo   |
+---------------------------+
             |
             v
+---------------------------+
| Routes                    |
| server/routes/*.js        |
| produtos, calculo, taxas  |
+---------------------------+
             |
             v
+---------------------------+
| precificacaoService       |
| server/services/          |
| precificacaoService.js    |
+---------------------------+
             |
             v
+---------------------------+
| precoService              |
| server/services/          |
| precoService.js           |
| calculadora de preco      |
+---------------------------+
             |
             v
+---------------------------+
| PostgreSQL                |
| produtos                  |
| taxas_marketplace         |
| produtos_marketplaces     |
+---------------------------+
```

## Fluxo de execucao atual

### 1. Frontend inicia a operacao

O usuario cadastra, edita ou recalcula um produto pela interface.

Exemplos:

- salvar um produto com marketplaces selecionados
- recalcular um produto
- recalcular todos os produtos
- simular um calculo avulso

### 2. A rota recebe a requisicao

As rotas em `server/routes/*.js` recebem os dados enviados pelo frontend.

Nesse ponto, o backend:

- valida campos obrigatorios
- normaliza entradas simples
- busca ou salva dados relacionados
- dispara o fluxo de calculo ou reprecificacao

### 3. `precificacaoService` orquestra o recalculo operacional

Quando a operacao exige reprecificacao de produto ou lote, `precificacaoService` assume o fluxo principal.

Esse service:

- carrega os relacionamentos `produtos_marketplaces`
- carrega as taxas do usuario por marketplace
- identifica a taxa correspondente a cada canal
- chama a funcao que adapta os dados do produto para a calculadora
- persiste o novo `preco_calculado`

### 4. `precoService` executa a calculadora

Depois que custo, margem e taxa estao resolvidos, `precoService` executa a conta matematica.

Essa camada:

- aplica normalizacao de valores
- valida limites matematicos
- calcula preco sugerido
- calcula lucro
- calcula margem real

### 5. O resultado volta para persistencia e resposta HTTP

O resultado calculado retorna ao fluxo operacional para:

- atualizar `produtos_marketplaces.preco_calculado`
- montar a resposta da API
- exibir o resultado no frontend

## Papel de `recalcularPrecoProduto`

Funcao localizada em:

- `server/services/precificacaoService.js`

Responsabilidade:

- atuar como adaptador entre a calculadora pura e o fluxo operacional de reprecificacao

O que ela faz:

- recebe um objeto com dados do produto-marketplace, especialmente `custo` e `margem`
- recebe a taxa do marketplace
- chama `calcularPrecoComTaxas`
- devolve o resultado traduzido para o formato usado pelo sistema atual

Saida principal:

- `preco_calculado`
- `lucro`
- `margem_real`

Leitura arquitetural:

`recalcularPrecoProduto` nao decide estrategia comercial. Ela apenas adapta a entrada do fluxo operacional para a calculadora e traduz a saida da calculadora para o formato de persistencia.

## Papel de `calcularPrecoComTaxas`

Funcao localizada em:

- `server/services/precoService.js`

Responsabilidade:

- executar a formula matematica central da precificacao

O que ela faz:

- recebe `custo`
- recebe `margem`
- recebe a estrutura de `taxa`
- considera taxa percentual, taxa fixa, frete medio, indice extra e imposto
- aplica a formula atual de precificacao
- retorna o resultado numerico

Saida principal:

- `preco_sugerido`
- `lucro`
- `margem_real`

Leitura arquitetural:

`calcularPrecoComTaxas` e a calculadora pura do sistema atual. Ela nao acessa rota HTTP, nao consulta banco e nao define regra de negocio. Seu papel e exclusivamente matematico.

## Relacao entre service operacional e calculadora

No estado atual, a separacao principal e:

- `precificacaoService` executa o fluxo operacional de reprecificacao
- `precoService` executa a formula matematica

Essa separacao e importante porque:

- evita espalhar a formula em varias rotas
- facilita reaproveitamento do calculo
- prepara o sistema para a futura entrada do motor de regras

## Observacoes sobre o estado atual

O sistema atual ainda nao possui:

- orquestrador de contexto formal
- motor de regras
- persistencia de regras como entidade propria
- trilha completa de explicacao da decisao

Por isso, a arquitetura atual deve ser entendida como uma base funcional de calculo parametrizado por marketplace, e nao como motor de regras completo.

## Arquitetura futura

Com a evolucao prevista nos documentos da pasta `docs/`, o fluxo de precificacao passara a separar com mais clareza contexto, estrategia e matematica.

Fluxo futuro esperado:

`Frontend -> Routes -> Pricing Orchestrator -> Rules Engine -> Pricing Calculator -> Database`

### Diagrama ASCII da arquitetura futura

```text
+---------------------------+
| Frontend                  |
+---------------------------+
             |
             v
+---------------------------+
| Routes                    |
| server/routes/*.js        |
+---------------------------+
             |
             v
+---------------------------+
| Pricing Orchestrator      |
| contexto e selecao        |
| de regras aplicaveis      |
+---------------------------+
             |
             v
+---------------------------+
| Rules Engine              |
| estrategia de precificacao|
| objetivos e restricoes    |
+---------------------------+
             |
             v
+---------------------------+
| Pricing Calculator        |
| calculadora pura          |
+---------------------------+
             |
             v
+---------------------------+
| Database                  |
+---------------------------+
```

### Papel do Pricing Orchestrator

Na arquitetura futura, o orquestrador sera responsavel por:

- reunir o contexto do produto
- identificar marketplace, categoria e outros sinais relevantes
- localizar regras candidatas
- resolver conflitos de escopo e prioridade
- encaminhar o conjunto consolidado para o motor de regras

### Papel do Rules Engine

Na arquitetura futura, o motor de regras sera responsavel por:

- interpretar as regras aplicaveis
- definir a estrategia de precificacao
- transformar regras em parametros objetivos de calculo

Em outras palavras:

- o motor decide a estrategia
- a calculadora executa a conta

### Papel futuro da calculadora

A calculadora continuara sendo um componente puro.

Isso significa que ela deve continuar:

- recebendo parametros numericos consolidados
- executando apenas matematica
- retornando preco, lucro e margem

Ela nao deve:

- decidir qual regra vence
- conhecer estrategia comercial
- resolver conflitos de contexto

## Comparacao entre arquitetura atual e futura

### Arquitetura atual

- calculo parametrizado por marketplace
- service operacional de reprecificacao
- calculadora central reutilizavel
- sem motor de regras formal

### Arquitetura futura

- orquestracao explicita de contexto
- motor de regras separado da calculadora
- estrategia de negocio fora da formula
- maior capacidade de explicacao, auditoria e evolucao

## Conclusao

No estado atual do projeto, a logica de precificacao esta organizada principalmente entre:

- rotas HTTP para entrada e resposta
- `precificacaoService` para o fluxo operacional
- `precoService` para a matematica da precificacao
- PostgreSQL para leitura e persistencia dos dados

Essa arquitetura ja oferece uma base importante: a calculadora esta separada do fluxo operacional. A evolucao futura deve preservar essa separacao e introduzir novas camadas para contexto e estrategia, sem reintroduzir regra de negocio dentro da formula matematica.
