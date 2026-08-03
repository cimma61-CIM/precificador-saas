# 02. Estado Atual da Precificacao

## Objetivo do documento

Documentar com clareza como a precificacao funciona hoje no projeto `precificador-saas`, considerando apenas o comportamento implementado no codigo atual.

Este documento descreve:

- quais arquivos participam do calculo
- qual formula e utilizada
- como o fluxo de precificacao acontece
- quais variaveis entram no calculo
- quais regras ja sao suportadas
- quais sao as limitacoes atuais

## Visao geral da implementacao atual

O sistema atual possui uma logica funcional de precificacao por marketplace, baseada em:

- custo do produto
- margem desejada
- taxas percentuais do marketplace
- taxa fixa
- frete medio
- indices extras percentuais
- imposto percentual

O calculo principal acontece no backend e o resultado e salvo por relacionamento entre produto e marketplace.

Hoje o sistema nao possui um motor de regras generico, declarativo ou configuravel por multiplos criterios. O comportamento implementado e uma formula fixa parametrizada por marketplace e por margem do produto naquele canal.

## Componentes envolvidos

### Arquivos responsaveis pelo calculo

Os principais arquivos relacionados a precificacao atual sao:

- `server/services/precoService.js`
- `server/services/precificacaoService.js`
- `server/routes/produtos.js`
- `server/routes/calculoRoutes.js`
- `server/routes/taxasRoutes.js`
- `server/migrations/`
- `client/produtos.js`
- `client/js/taxas.js`
- `server/routes/analiseRoutes.js`
- `client/resumo.js`

### Papel de cada arquivo

`server/services/precoService.js`

- contem a formula principal de precificacao
- normaliza percentuais e valores monetarios
- converte indices extras textuais em percentual total
- busca taxa de marketplace para calculo avulso

`server/services/precificacaoService.js`

- executa recalculo em lote
- recalcula produtos por marketplace
- atualiza `preco_calculado` na tabela de relacionamento

`server/routes/produtos.js`

- salva produtos
- resolve marketplaces selecionados
- grava margens por marketplace
- recalcula os precos dos marketplaces ao salvar o produto
- monta a resposta enriquecida com lucro estimado e margem real

`server/routes/calculoRoutes.js`

- expoe um endpoint de calculo direto com base em custo, marketplace, margem e lucro minimo

`server/routes/taxasRoutes.js`

- cadastra e atualiza as taxas utilizadas no calculo

`server/migrations/`

- define, de forma versionada, as tabelas e colunas usadas pela precificacao

`client/produtos.js`

- calcula simulacoes no frontend
- calcula impacto de preco concorrente
- aciona recalculo por produto e em massa
- exibe os precos calculados por marketplace

`client/js/taxas.js`

- opera a tela de cadastro e manutencao das taxas de marketplace

`server/routes/analiseRoutes.js` e `client/resumo.js`

- apresentam indicadores baseados nos campos de preco do produto
- nao executam o motor principal por marketplace, mas participam da visao atual da precificacao

## Fluxo atual de precificacao

O fluxo atual implementado funciona assim:

1. O usuario cadastra ou edita um produto informando `custo`.
2. O usuario pode informar `preco_venda` diretamente ou informar `margem_desejada` para a venda direta.
3. O usuario seleciona um ou mais marketplaces para o produto.
4. Para cada marketplace selecionado, o usuario define uma margem especifica ou usa a margem padrao.
5. As taxas do marketplace sao cadastradas separadamente na tabela `taxas_marketplace`.
6. Ao salvar o produto, o backend recria os relacionamentos em `produtos_marketplaces`.
7. O backend busca as taxas de cada marketplace vinculado.
8. O backend executa o calculo principal para cada relacao produto-marketplace.
9. O resultado e salvo em `produtos_marketplaces.preco_calculado`.
10. Na leitura dos produtos, o backend recalcula lucro estimado e margem real para exibicao.
11. O frontend permite recalculo individual, recalculo em massa e simulacao temporaria sem persistencia.

### Fluxo resumido

Produto cadastrado ou atualizado  
↓  
Marketplaces vinculados ao produto  
↓  
Taxas do marketplace carregadas  
↓  
Formula de precificacao executada  
↓  
Preco calculado salvo em `produtos_marketplaces.preco_calculado`  
↓  
Resultado exibido com lucro estimado e margem real

## Formula atual

### Formula principal por marketplace

O calculo principal esta em `server/services/precoService.js`, na funcao `calcularPrecoComTaxas`.

O sistema calcula:

`taxasTotaisPercentuais = taxa_percentual + imposto_percentual + indice_extra_percentual`

`divisorMargem = 1 - taxasTotaisPercentuais - margem`

`divisorLucro = 1 - taxasTotaisPercentuais`

Preco por margem:

`precoPorMargem = (custo + frete_medio + taxa_fixa) / divisorMargem`

Preco por lucro minimo:

`precoPorLucro = (custo + frete_medio + taxa_fixa + lucro_minimo) / divisorLucro`

Preco final escolhido:

`preco = max(precoPorMargem, precoPorLucro)`

Lucro calculado:

`lucro = preco - custo - frete_medio - taxa_fixa - (preco * taxa_percentual) - (preco * indice_extra_percentual) - (preco * imposto_percentual)`

Margem real:

`margem_real = lucro / preco`

### Validacoes da formula

O calculo falha quando:

- `taxa_percentual + imposto_percentual + indice_extra_percentual + margem >= 100%`
- `taxa_percentual + imposto_percentual + indice_extra_percentual >= 100%`

Nesses casos, o sistema considera a margem invalida para aquele marketplace e o preco calculado nao e produzido normalmente.

### Calculo de venda direta do produto

Separadamente da precificacao por marketplace, existe um calculo de venda direta no backend e no frontend:

`preco_venda = custo / (1 - margem_desejada)`

Esse calculo e usado quando o usuario informa margem desejada para o produto e nao informa o preco de venda diretamente.

## Variaveis e entradas do calculo

As variaveis atualmente utilizadas na precificacao sao:

- `custo`
- `margem`
- `margem_desejada`
- `preco`
- `preco_venda`
- `taxa_percentual`
- `taxa_fixa`
- `frete_medio`
- `indices_extras`
- `indice_extra_percentual`
- `imposto_percentual`
- `lucro_minimo`

### Variaveis derivadas durante o calculo

- `taxasTotaisPercentuais`
- `divisorMargem`
- `divisorLucro`
- `precoPorMargem`
- `precoPorLucro`
- `preco_sugerido`
- `lucro`
- `margem_real`
- `preco_calculado`

## Regras atualmente suportadas

O sistema atual suporta apenas um conjunto limitado de regras implicitas na formula e no modelo de dados.

### Regras por marketplace

Suportado.

Cada marketplace pode ter sua propria configuracao de:

- taxa percentual
- taxa fixa
- frete medio
- indices extras
- imposto percentual

Essas configuracoes sao armazenadas por usuario em `taxas_marketplace`.

### Regras por produto

Suportado parcialmente.

Cada produto pode ter:

- preco de venda direto
- margem desejada geral
- margem especifica por marketplace

As margens por canal ficam em `produtos_marketplaces`.

### Regras por categoria

Nao suportado.

Nao existe estrutura de categoria aplicada ao motor atual.

### Margem minima

Nao existe como regra formal separada.

O que existe hoje e uma margem desejada usada diretamente na formula.

### Preco minimo

Nao suportado.

Nao existe campo, regra ou validacao especifica de preco minimo.

### Seguir concorrente

Nao suportado como regra automatica.

O frontend apenas permite simular o impacto de um preco concorrente informado manualmente.

### Regras personalizadas

Nao suportado.

Nao existe cadastro de regras, condicoes, prioridade, vigencia ou politica de conflito.

### Lucro minimo

Existe apenas no endpoint avulso de calculo direto.

Nao faz parte do fluxo principal de salvamento e recalculo dos produtos.

## Persistencia e dados relacionados

### Tabelas principais

`produtos`

- guarda dados do produto
- guarda `custo`, `preco`, `preco_venda`, `margem` e `margem_desejada`

`marketplaces`

- cadastro dos canais

`taxas_marketplace`

- guarda a configuracao de taxas por usuario e por marketplace

`produtos_marketplaces`

- representa o vinculo do produto com cada marketplace
- guarda a margem daquele canal
- guarda o `preco_calculado`

### Observacoes sobre persistencia

- o preco por marketplace nao e salvo na tabela principal de produtos
- ele e salvo na tabela de relacionamento `produtos_marketplaces`
- o dashboard atual ainda usa campos de `produtos.preco` para alguns indicadores

## Limitacoes identificadas

As principais limitacoes da implementacao atual sao:

- nao existe um motor de regras generico
- nao existe catalogo de regras configuraveis
- nao existe prioridade entre regras
- nao existe regra por categoria
- nao existe regra por familia, marca ou atributo
- nao existe preco minimo
- nao existe margem minima formal separada da margem desejada
- nao existe teto de preco
- nao existe automacao para seguir concorrente
- nao existe historico de precos calculados
- nao existe versionamento de regras
- nao existe trilha de auditoria do motivo do preco final
- nao existe simulacao persistida
- nao existe processamento assincrono ou fila para grandes lotes
- o dashboard usa a venda direta do produto e nao o preco por marketplace como base principal

## Pontos de atencao para evolucao

Alguns pontos do estado atual merecem registro por influencia futura:

- a formula principal ja esta centralizada no backend, o que facilita controle funcional
- a simulacao do frontend replica a formula principal, criando duplicidade de regra entre frontend e backend
- existe referencia a `precificacao` em `server/routes/marketplacesRoutes.js`, mas essa estrutura nao aparece como parte do fluxo operacional principal identificado
- o sistema atual e funcional para precificacao parametrizada, mas ainda nao possui camada propria de regras

## Conclusao

O sistema hoje ja possui uma base real de precificacao, mas essa base e restrita a um modelo de calculo parametrizado por marketplace.

Em termos praticos, o projeto atual:

- calcula preco a partir de custo, margem e taxas
- permite margens diferentes por marketplace
- salva o resultado calculado por canal
- suporta recalculo em massa e simulacao

Ao mesmo tempo, o sistema ainda nao pode ser classificado como um motor de regras completo, porque nao possui:

- regras configuraveis por multiplos criterios
- mecanismos de prioridade e conflito
- regras customizadas
- governanca, auditoria e historico de decisao

Conclusao objetiva:

O estado atual da precificacao no projeto `precificador-saas` e o de um calculador parametrizado por marketplace. Ainda nao existe um motor de regras completo.
