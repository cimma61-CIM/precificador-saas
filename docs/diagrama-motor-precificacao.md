# Diagrama do Motor de Precificacao

## Objetivo do documento

Documentar, de forma visual e objetiva, o fluxo completo do motor de precificacao do projeto `precificador-saas`.

Este documento complementa a documentacao arquitetural ja existente e organiza em um unico lugar:

- o fluxo atual de precificacao
- o fluxo atual de simulacao
- o fluxo atual de reprecificacao em massa
- a arquitetura futura com orquestrador e motor de regras

## Visao geral

Hoje o sistema funciona como um calculador parametrizado por marketplace.

Os componentes centrais ja existentes sao:

- frontend para entrada e exibicao
- rotas HTTP no backend
- `precificacaoService` para o fluxo operacional
- `precoService` para a calculadora pura
- PostgreSQL para leitura e persistencia

O sistema atual ainda nao possui um motor de regras formal, mas ja possui uma separacao importante entre execucao operacional e calculo matematico.

## Camadas do motor atual

### Frontend

Responsabilidades:

- coletar custo, margem e marketplaces
- disparar simulacao, cadastro e reprecificacao
- exibir resultado calculado

### API routes

Responsabilidades:

- receber requisicoes HTTP
- validar entrada
- encaminhar a operacao para services
- devolver resposta ao frontend

Arquivos principais:

- `server/routes/produtos.js`
- `server/routes/calculoRoutes.js`
- `server/routes/taxasRoutes.js`

### `precificacaoService`

Responsabilidades:

- organizar o recalculo operacional
- percorrer relacoes produto-marketplace
- carregar taxas necessarias
- adaptar a chamada para a calculadora
- persistir `preco_calculado`

Arquivo principal:

- `server/services/precificacaoService.js`

### `precoService`

Responsabilidades:

- normalizar entradas numericas
- executar a formula de precificacao
- retornar preco, lucro e margem real

Arquivo principal:

- `server/services/precoService.js`

### Database

Responsabilidades:

- armazenar produtos
- armazenar marketplaces
- armazenar taxas por canal
- armazenar `preco_calculado` por relacionamento

Estruturas principais:

- `produtos`
- `marketplaces`
- `taxas_marketplace`
- `produtos_marketplaces`

## Fluxo atual do motor de precificacao

No fluxo atual, a execucao principal pode ser lida assim:

`Frontend -> API routes -> precificacaoService -> precoService -> database persistence`

### Leitura do fluxo

1. O frontend envia uma acao de cadastro, recalculo ou consulta.
2. A rota valida a requisicao e prepara a operacao.
3. `precificacaoService` organiza o fluxo operacional quando ha reprecificacao.
4. `precoService` executa a conta matematica da precificacao.
5. O resultado retorna para persistencia e resposta HTTP.

### Diagrama ASCII do fluxo atual

```text
+---------------------------+
| Frontend                  |
| telas e scripts client    |
+---------------------------+
             |
             v
+---------------------------+
| API Routes                |
| server/routes/*.js        |
+---------------------------+
             |
             v
+---------------------------+
| precificacaoService       |
| fluxo operacional         |
| de precificacao           |
+---------------------------+
             |
             v
+---------------------------+
| precoService              |
| calculadora pura          |
| de precificacao           |
+---------------------------+
             |
             v
+---------------------------+
| Database Persistence      |
| PostgreSQL                |
+---------------------------+
```

## Como a simulacao funciona hoje

A simulacao atual existe para testar um resultado de preco sem persistir alteracoes reais no banco.

No estado atual do projeto, a simulacao esta ligada principalmente ao frontend e ao endpoint de calculo direto, reaproveitando a mesma logica matematica central.

Fluxo conceitual atual:

`Frontend simulator -> pricing service -> pricing calculator -> simulated result`

### Leitura do fluxo de simulacao

1. O usuario informa custo, marketplace, margem e, quando aplicavel, lucro minimo.
2. O frontend envia a simulacao para o backend.
3. O backend resolve a taxa do marketplace.
4. A calculadora executa a conta.
5. O resultado e devolvido ao frontend sem persistencia no banco.

### Diagrama ASCII da simulacao

```text
+---------------------------+
| Frontend Simulator        |
| simulacao de preco        |
+---------------------------+
             |
             v
+---------------------------+
| Pricing Service           |
| rota de calculo e busca   |
| da taxa do marketplace    |
+---------------------------+
             |
             v
+---------------------------+
| Pricing Calculator        |
| precoService              |
+---------------------------+
             |
             v
+---------------------------+
| Simulated Result          |
| sem persistencia          |
+---------------------------+
```

### Observacao importante sobre simulacao

O objetivo da simulacao atual e reaproveitar a formula central sem gravar resultado em `produtos_marketplaces`.

Isso significa:

- ha execucao de calculo
- ha retorno de preco, lucro e margem
- nao ha atualizacao persistente de preco calculado

## Como a reprecificacao em massa funciona hoje

A reprecificacao em massa reutiliza o fluxo operacional de `precificacaoService` para recalcular varios produtos e atualizar o banco.

Fluxo conceitual atual:

`Repricing trigger -> product selection -> loop through products -> precificacaoService -> pricing calculator -> database update`

### Leitura do fluxo de reprecificacao em massa

1. Um gatilho manual chama o endpoint de recalculo.
2. O sistema seleciona os produtos e seus marketplaces.
3. O service percorre cada relacao produto-marketplace.
4. Para cada item, o service encontra a taxa correspondente.
5. A calculadora executa o calculo matematico.
6. O sistema atualiza `preco_calculado` no banco.

### Diagrama ASCII da reprecificacao em massa

```text
+---------------------------+
| Repricing Trigger         |
| acao manual ou endpoint   |
+---------------------------+
             |
             v
+---------------------------+
| Product Selection         |
| produtos e marketplaces   |
| a recalcular              |
+---------------------------+
             |
             v
+---------------------------+
| Loop Through Products     |
| iteracao por relacao      |
| produto-marketplace       |
+---------------------------+
             |
             v
+---------------------------+
| precificacaoService       |
| fluxo de reprecificacao   |
+---------------------------+
             |
             v
+---------------------------+
| Pricing Calculator        |
| precoService              |
+---------------------------+
             |
             v
+---------------------------+
| Database Update           |
| UPDATE preco_calculado    |
+---------------------------+
```

### Papel da reprecificacao em massa no estado atual

Hoje essa camada:

- nao usa motor de regras formal
- nao possui fila dedicada
- nao possui processamento assincrono completo
- reaproveita a mesma calculadora para varios itens

Mesmo assim, ela ja representa a base operacional para a futura evolucao do motor em escala.

## Funcoes-chave do motor atual

### `recalcularPrecoProduto`

Funcao em:

- `server/services/precificacaoService.js`

Responsabilidade:

- adaptar o contexto de produto-marketplace para a calculadora pura
- traduzir a saida da calculadora para o formato operacional do sistema

Ela recebe:

- custo do produto
- margem da relacao
- taxa do marketplace

Ela devolve:

- `preco_calculado`
- `lucro`
- `margem_real`

### `calcularPrecoComTaxas`

Funcao em:

- `server/services/precoService.js`

Responsabilidade:

- executar a formula matematica de precificacao

Ela recebe:

- custo
- margem
- taxa percentual
- taxa fixa
- frete medio
- indice extra percentual
- imposto percentual
- lucro minimo, quando informado

Ela devolve:

- `preco_sugerido`
- `lucro`
- `margem_real`

Leitura arquitetural:

- `recalcularPrecoProduto` pertence ao fluxo operacional
- `calcularPrecoComTaxas` pertence ao nucleo matematico

## Arquitetura futura do motor de regras

Com a evolucao prevista na documentacao do projeto, o fluxo deixara de depender apenas de uma formula parametrizada por marketplace e passara a separar contexto, estrategia e calculo.

Fluxo futuro esperado:

`Frontend -> API routes -> Pricing Orchestrator -> Rules Engine -> Pricing Calculator -> Database`

### Responsabilidades futuras

### Pricing Orchestrator

Responsabilidades:

- reunir o contexto da precificacao
- carregar regras aplicaveis
- coordenar o fluxo de decisao e calculo

O orquestrador deve identificar:

- produto
- marketplace
- categoria
- sinais de contexto relevantes

### Rules Engine

Responsabilidades:

- interpretar regras de precificacao
- determinar margens, objetivos ou restricoes
- transformar estrategia de negocio em parametros objetivos para a calculadora

O motor de regras define a estrategia.

### Pricing Calculator

Responsabilidades:

- receber parametros consolidados
- executar apenas o calculo matematico
- retornar preco, lucro e margem

A calculadora permanece pura. Ela nao escolhe regras e nao decide estrategia.

### Diagrama ASCII da arquitetura futura

```text
+---------------------------+
| Frontend                  |
+---------------------------+
             |
             v
+---------------------------+
| API Routes                |
| server/routes/*.js        |
+---------------------------+
             |
             v
+---------------------------+
| Pricing Orchestrator      |
| contexto, selecao         |
| e coordenacao             |
+---------------------------+
             |
             v
+---------------------------+
| Rules Engine              |
| regras, objetivos         |
| e restricoes              |
+---------------------------+
             |
             v
+---------------------------+
| Pricing Calculator        |
| calculo matematico puro   |
+---------------------------+
             |
             v
+---------------------------+
| Database                  |
+---------------------------+
```

## Comparacao entre estado atual e estado futuro

### Estado atual

- fluxo operacional centralizado em `precificacaoService`
- calculadora central em `precoService`
- precificacao parametrizada por marketplace
- simulacao e reprecificacao ainda sem motor de regras formal

### Estado futuro

- orquestrador dedicado ao contexto
- motor de regras dedicado a estrategia
- calculadora preservada como componente puro
- maior clareza entre decisao de negocio e matematica

## Conclusao

O mapa atual do motor de precificacao pode ser resumido em tres trilhas principais:

- fluxo principal de precificacao com persistencia
- fluxo de simulacao sem persistencia
- fluxo de reprecificacao em massa com iteracao e update no banco

Essa base ja mostra uma separacao importante entre operacao e calculo. A arquitetura futura deve preservar a calculadora pura e introduzir as camadas de orquestracao e regras para que a estrategia de precificacao deixe de ficar implicita apenas nos parametros atuais.
