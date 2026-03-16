# 05. Arquitetura Alvo

## Objetivo do documento

Descrever a arquitetura futura do motor de precificacao do `precificador-saas`, mostrando como o sistema pode evoluir do estado atual, baseado em calculo parametrizado por marketplace, para um motor de regras de precificacao mais completo.

Este documento nao define implementacao tecnica detalhada. O foco e arquitetural: separar responsabilidades, esclarecer componentes e orientar a evolucao do sistema de forma incremental.

## 1. Visao geral da arquitetura

A arquitetura alvo deve dividir a precificacao em componentes com responsabilidades bem definidas.

Os componentes principais sao:

- calculadora de preco
- motor de regras
- orquestrador de contexto
- persistencia de regras
- camada de simulacao
- mecanismo de reprecificacao em massa

### Papel de cada componente

**Calculadora de preco**

- executa apenas o calculo matematico
- recebe parametros numericos
- retorna preco, lucro, margem e composicao do resultado

**Motor de regras**

- interpreta as regras de precificacao
- transforma estrategia de negocio em parametros de calculo
- define objetivos e restricoes aplicaveis

**Orquestrador de contexto**

- identifica o contexto da operacao
- seleciona regras aplicaveis
- resolve conflitos
- monta os parametros finais que serao enviados para a calculadora

**Persistencia de regras**

- armazena definicoes de regras
- armazena escopo, prioridade, parametros e status

**Camada de simulacao**

- permite testar cenarios antes de aplicar mudancas reais
- reaproveita o mesmo raciocinio do motor

**Mecanismo de reprecificacao em massa**

- executa o fluxo de orquestracao e calculo em grande volume
- permite recalculo controlado por diferentes recortes

### Fluxo geral da arquitetura

O fluxo alvo pode ser descrito assim:

1. Um produto entra em processo de precificacao.
2. O orquestrador coleta o contexto relevante.
3. O sistema identifica as regras ativas e aplicaveis.
4. O orquestrador resolve conflitos e consolida a estrategia final.
5. O motor de regras transforma essa estrategia em parametros objetivos de calculo.
6. A calculadora recebe esses parametros e executa a conta matematica.
7. O resultado e retornado para exibicao, simulacao ou persistencia.
8. Quando necessario, o processo pode ser executado para um item ou em massa.

### Leitura conceitual da arquitetura

Na arquitetura futura:

- a estrategia nao fica dentro da formula
- a formula nao escolhe a estrategia
- a selecao de regras nao fica espalhada em rotas ou frontend

Cada componente tem uma funcao clara no fluxo de precificacao.

## 2. Calculadora de preco

A calculadora de preco continua sendo um componente central da arquitetura, mas com responsabilidade estritamente matematica.

### Papel da calculadora

A calculadora deve:

- receber parametros consolidados
- executar contas
- retornar resultados numericos

Ela nao deve:

- decidir qual regra se aplica
- escolher estrategia de negocio
- resolver conflitos entre objetivos
- interpretar contexto comercial

### Reaproveitamento do sistema atual

O sistema atual ja possui uma base reutilizavel para essa camada, principalmente em:

- `server/services/precoService.js`
- `server/services/precificacaoService.js`

Esses componentes hoje concentram a formula de precificacao e o recalculo operacional por marketplace.

### Forma esperada de funcionamento

Na arquitetura alvo, a calculadora atua como uma funcao de entrada e saida:

- entrada: custo, custos contextuais, margem alvo, restricoes ou parametros consolidados
- saida: preco sugerido, lucro esperado, margem real e detalhes do calculo

Ou seja, a calculadora continua sendo o mecanismo de conta, mas deixa de carregar a responsabilidade por decidir a politica comercial.

## 3. Motor de regras

O motor de regras sera o componente responsavel por interpretar as regras cadastradas e converter essas regras em uma estrategia concreta de precificacao.

### Responsabilidades do motor de regras

O motor de regras deve:

- interpretar regras ativas
- considerar objetivos de negocio
- aplicar estrategias de precificacao
- definir quais parametros devem ser usados no calculo

### O que o motor de regras nao faz

O motor de regras nao deve:

- executar calculos matematicos diretamente
- substituir a calculadora
- assumir responsabilidade de persistencia bruta

Seu papel e decisorio e estrategico.

### Resultado esperado do motor

Ao final da avaliacao, o motor deve ser capaz de produzir algo conceitualmente equivalente a:

- margem alvo final
- lucro minimo aplicavel
- limite de preco
- ajustes de posicionamento
- restricoes que nao podem ser violadas

Esses parametros consolidados entao seguem para a calculadora.

### Interface conceitual do motor de regras

O motor de regras deve operar como uma camada intermediaria entre o orquestrador e a calculadora.

Ele recebe:

- contexto consolidado pelo orquestrador
- conjunto de regras aplicaveis
- informacoes sobre prioridade, escopo e restricoes

Ele retorna:

- parametros finais de calculo
- resumo das regras aplicadas
- justificativa da consolidacao
- metadados de decisao necessarios para explicacao e auditoria

## 4. Orquestrador de contexto

O orquestrador de contexto sera a camada responsavel por entender em que situacao a precificacao esta acontecendo e qual conjunto de regras deve ser considerado.

### Responsabilidades do orquestrador

O orquestrador deve:

- identificar o contexto do produto
- carregar as regras aplicaveis
- resolver conflitos entre regras
- determinar os parametros finais de calculo

### Exemplos de contexto

O contexto pode incluir elementos como:

- marketplace
- categoria
- produto
- estrategia

Tambem pode incluir, conforme a evolucao do sistema:

- dados operacionais do canal
- condicao promocional
- status do produto
- politicas comerciais ativas

### Exemplo conceitual de fluxo do orquestrador

1. Receber o produto ou lote a ser precificado.
2. Identificar marketplace, categoria, produto e sinais estrategicos.
3. Buscar regras de escopo global, marketplace, categoria e produto.
4. Filtrar regras ativas.
5. Aplicar prioridade e resolver conflitos.
6. Consolidar objetivos, custos contextuais e restricoes.
7. Enviar os parametros finais para a calculadora.

### Escopos de regra

O sistema deve reconhecer quatro niveis principais de escopo:

**Global**

- representa uma politica ampla para toda a operacao
- funciona como camada base de comportamento

**Marketplace**

- representa politica especifica de um canal
- adapta a estrategia as caracteristicas do marketplace

**Categoria**

- representa politica para um conjunto de produtos semelhantes
- organiza comportamento por familia comercial

**Produto**

- representa a excecao ou ajuste mais especifico
- permite refinamento pontual sobre um item determinado

### Prioridade entre escopos

Como regra de precedencia inicial, o sistema deve considerar:

`produto > categoria > marketplace > global`

### Motivo dessa prioridade

Essa prioridade existe porque o escopo mais especifico tende a representar o contexto mais preciso da decisao de preco.

Em termos conceituais:

- a regra global define a politica de base
- a regra de marketplace adapta a politica ao canal
- a regra de categoria refina o comportamento para uma familia de produtos
- a regra de produto resolve a necessidade mais particular

Isso evita que uma regra muito ampla sobrescreva indevidamente uma necessidade altamente localizada.

### Conflitos entre regras de escopos diferentes

Quando houver conflito entre regras equivalentes de escopos diferentes, o sistema deve resolver a disputa nesta ordem:

1. verificar se existe restricao forte que nao pode ser violada
2. aplicar a precedencia de escopo
3. aplicar prioridade numerica dentro do conjunto remanescente
4. registrar qual regra prevaleceu e por qual motivo

Exemplos:

- uma margem de produto pode prevalecer sobre uma margem global
- um preco minimo global de protecao pode continuar valendo mesmo diante de uma regra especifica agressiva
- uma regra de categoria pode substituir uma regra de marketplace quando o objetivo for mais aderente ao produto analisado

### Conflitos entre regras do mesmo escopo

O sistema tambem precisa resolver conflitos entre regras que compartilham o mesmo escopo.

Exemplo:

- duas regras de margem para o mesmo marketplace

Nesses casos, o motor deve usar criterios adicionais de desempate.

### Ordem sugerida para conflitos no mesmo escopo

Quando duas regras do mesmo tipo e do mesmo escopo concorrerem, o sistema deve considerar:

1. prioridade numerica
2. regra mais especifica dentro do proprio contexto
3. regra mais recente

### Explicacao dos criterios

**Prioridade numerica**

- deve ser o primeiro criterio de desempate
- permite ao negocio declarar qual regra deve prevalecer

**Regra mais especifica**

- se duas regras estiverem no mesmo escopo formal, o motor ainda pode verificar qual delas possui contexto mais delimitado
- por exemplo, uma regra com vigencia ativa e condicao adicional pode ser considerada mais especifica do que outra generica

**Regra mais recente**

- serve como criterio residual quando ainda houver empate
- ajuda a lidar com revisoes ou substituicoes operacionais

### Combinacao de regras

O motor nao deve assumir que sempre existira apenas uma regra vencedora.

Em muitos cenarios, regras diferentes devem ser combinadas em vez de competir entre si.

Exemplo:

- regra de margem
- regra de concorrente
- regra de preco minimo

### Como combinar regras sem quebrar o calculo

A combinacao deve seguir a separacao entre objetivo, ajuste e restricao.

Leitura conceitual:

- uma regra pode definir o objetivo financeiro, como margem alvo
- outra pode definir um ajuste de posicionamento, como acompanhar concorrente
- outra pode impor um limite, como preco minimo

O motor deve consolidar o efeito dessas regras em parametros finais compativeis com a calculadora.

Isso significa:

- a calculadora continua recebendo numeros e limites consolidados
- a combinacao acontece antes da etapa matematica
- nenhuma regra deve obrigar a calculadora a conhecer a logica de negocio internamente

### Estrutura conceitual da combinacao

Para preservar clareza, o motor deve organizar o efeito das regras em grupos como:

- objetivos
- custos contextuais
- ajustes de mercado
- restricoes

Exemplo conceitual:

1. definir margem alvo pela regra de rentabilidade
2. aplicar ajuste competitivo com base na regra de concorrente
3. validar se o resultado respeita preco minimo
4. enviar os parametros consolidados para a calculadora

### Registro das regras aplicadas

O sistema deve registrar quais regras participaram da decisao de preco.

Esse registro e necessario para:

- explicacao do preco ao usuario
- auditoria do motor de regras

### O que deve ser registrado conceitualmente

Para cada processo de precificacao, o sistema deve ser capaz de registrar:

- contexto considerado
- regras candidatas encontradas
- regras efetivamente aplicadas
- regras descartadas
- motivo do descarte ou da prevalencia
- parametros finais consolidados
- resultado final retornado pela calculadora

### Utilidade desse registro

Esse rastreamento permitira responder perguntas como:

- por que este preco foi escolhido
- qual regra alterou a margem alvo
- por que a regra de concorrente nao venceu
- qual restricao impediu um preco menor

### Papel desse registro na arquitetura

Esse registro nao faz parte da calculadora. Ele pertence ao fluxo de orquestracao e decisao.

Em outras palavras:

- a calculadora calcula
- o motor decide
- o orquestrador registra o caminho da decisao

### Papel arquitetural

O orquestrador e o ponto de unificacao da decisao. Ele evita que:

- rotas tomem decisoes de negocio
- frontend replique regra critica
- services isolados passem a conter `ifs` dispersos sem padrao

### Interface conceitual entre os tres componentes

O fluxo entre orquestrador, motor de regras e calculadora deve ser explicitamente separado.

### 1. Orquestrador de contexto

**Responsabilidade**

- identifica contexto do produto
- carrega regras aplicaveis
- resolve conflitos de escopo

**Dados que recebe**

- identificacao do produto ou lote
- dados do produto
- dados do marketplace
- dados de categoria
- sinais estrategicos do contexto
- regras candidatas disponiveis

**Dados que retorna**

- contexto consolidado
- lista de regras aplicaveis
- ordenacao preliminar por escopo e prioridade
- informacoes de conflito de escopo ja resolvidas

### 2. Motor de regras

**Responsabilidade**

- interpreta regras
- combina regras aplicaveis
- gera parametros finais de calculo

**Dados que recebe**

- contexto consolidado
- regras aplicaveis ja filtradas
- informacoes de prioridade
- restricoes relevantes

**Dados que retorna**

- parametros finais da calculadora
- regras efetivamente aplicadas
- regras descartadas e seus motivos
- justificativa da composicao final

### 3. Calculadora de preco

**Responsabilidade**

- recebe parametros
- executa calculo matematico
- retorna preco, lucro e margem

**Dados que recebe**

- custo base
- custos contextuais consolidados
- objetivos consolidados, como margem alvo ou lucro minimo
- restricoes finais convertidas em parametros compativeis com a formula

**Dados que retorna**

- preco sugerido
- lucro esperado
- margem real
- detalhes numericos do calculo

### Fluxo completo de execucao do calculo de preco

O fluxo conceitual completo deve ser:

`produto -> orquestrador -> motor de regras -> calculadora -> resultado`

Leitura detalhada:

1. o produto entra no fluxo de precificacao
2. o orquestrador identifica o contexto do produto
3. o orquestrador localiza as regras aplicaveis
4. o orquestrador resolve conflitos de escopo
5. o motor de regras interpreta e combina as regras validas
6. o motor transforma regras em parametros finais de calculo
7. a calculadora executa o calculo matematico
8. o sistema retorna o resultado com explicacao e rastreabilidade

### Como o motor transforma regras em parametros para a calculadora

O motor de regras nao envia regras brutas para a calculadora. Ele transforma essas regras em uma estrutura numerica e objetiva.

Exemplos conceituais:

- uma regra de margem desejada vira `margem_alvo`
- uma regra de lucro minimo vira `lucro_minimo`
- uma regra de preco minimo vira uma restricao de piso
- uma regra de concorrente vira ajuste de posicionamento
- uma regra contextual pode alterar custos considerados ou objetivo comercial

Ao final da consolidacao, a calculadora deve receber apenas aquilo que precisa para calcular.

### Estrutura conceitual dos parametros finais

Os parametros finais devem poder ser organizados em blocos como:

- custos base
- custos contextuais
- objetivos
- restricoes
- ajustes de mercado

Essa organizacao ajuda a preservar a separacao entre estrategia e matematica.

### Registro da decisao de precificacao

O sistema deve registrar, conceitualmente, todo o caminho da decisao.

Esse registro deve incluir:

- regras aplicadas
- parametros utilizados
- resultado final do calculo

### Detalhamento do registro

O registro ideal da execucao deve conter:

- identificacao do contexto analisado
- lista de regras candidatas
- lista de regras aplicadas
- lista de regras descartadas
- motivo de cada descarte ou prevalencia
- parametros finais enviados para a calculadora
- resultado numerico devolvido pela calculadora

### Finalidade do registro

Esse registro sera a base para:

- explicacao do preco ao usuario
- auditoria do motor de regras
- investigacao de divergencias
- confiabilidade operacional

### Papel do registro na separacao arquitetural

Assim como a selecao de regras nao deve ficar dentro da calculadora, o registro da decisao tambem nao pertence a ela.

O papel esperado e:

- o orquestrador organiza o contexto
- o motor decide a estrategia e os parametros
- a calculadora executa a conta
- o fluxo de execucao registra a trilha da decisao

## 5. Persistencia de regras

Para que o sistema funcione como motor de regras, ele precisara persistir informacoes de regra como parte do dominio de precificacao.

### Conceitos que precisam ser armazenados

O sistema precisa armazenar, conceitualmente:

- regras
- escopo da regra
- prioridade
- estado ativo ou inativo
- parametros

### Papel dessa persistencia

Essa camada deve permitir:

- cadastrar politicas de precificacao
- ativar ou desativar comportamentos
- controlar prioridade entre regras
- identificar em que contexto cada regra vale

### Conceito de regra de precificacao

Uma regra de precificacao deve ser entendida como uma entidade de dominio que representa uma decisao de negocio reutilizavel.

Essa entidade nao executa calculo e nao substitui a calculadora. Seu papel e representar, de forma estruturada, uma orientacao estrategica que podera influenciar os parametros enviados para a calculadora.

Como conceito minimo, uma regra deve conter:

- tipo de regra
- escopo da regra
- parametros da regra
- prioridade
- estado ativo ou inativo

### Modelo conceitual da entidade regra

Sem definir ainda banco de dados ou API, a entidade `regra` deve possuir conceitualmente campos como:

- `id`
- `nome`
- `descricao`
- `tipo`
- `grupo`
- `escopo_tipo`
- `escopo_referencia`
- `parametros`
- `prioridade`
- `ativo`
- `origem`
- `vigencia_inicio`
- `vigencia_fim`
- `observacoes`
- `criado_em`
- `atualizado_em`

### Significado conceitual dos campos

`id`

- identificador da regra

`nome`

- titulo funcional da regra

`descricao`

- explicacao resumida do objetivo da regra

`tipo`

- define a familia da regra, como margem desejada, lucro minimo, preco minimo, seguir concorrente ou promocao

`grupo`

- organiza a regra em uma categoria funcional maior, como rentabilidade, mercado, contexto ou avancada

`escopo_tipo`

- define o nivel de aplicacao da regra, como global, marketplace, categoria ou produto

`escopo_referencia`

- identifica qual elemento concreto do escopo recebe a regra quando o escopo nao for global

`parametros`

- conjunto de valores necessarios para a regra operar, como margem alvo, lucro minimo, delta competitivo ou limite de queda

`prioridade`

- define a ordem de precedencia entre regras concorrentes

`ativo`

- indica se a regra esta em vigor ou apenas cadastrada

`origem`

- identifica se a regra veio de configuracao padrao do sistema ou de definicao do usuario

`vigencia_inicio` e `vigencia_fim`

- permitem representar regras temporarias, como promocao ou estrategia de lancamento

`observacoes`

- espaco para registrar contexto complementar de negocio

`criado_em` e `atualizado_em`

- campos conceituais de rastreabilidade administrativa

### Observacoes sobre os parametros da regra

O campo conceitual `parametros` deve ser entendido como um conjunto estruturado de entradas proprias da regra.

Exemplos:

- margem desejada: `{ margem_alvo }`
- lucro minimo: `{ lucro_minimo }`
- preco minimo: `{ preco_minimo }`
- seguir concorrente: `{ referencia_concorrente, modo_acompanhamento }`
- ficar abaixo do concorrente: `{ delta_tipo, delta_valor }`
- produto em promocao: `{ percentual_promocional, vigencia }`

O importante nesta fase e reconhecer que cada tipo de regra possui parametros proprios, mas todos continuam pertencendo a uma mesma entidade de dominio.

### Como a entidade regra sera usada pelo motor de regras

Futuramente, a entidade `regra` sera usada pelo motor de regras como materia-prima de decisao.

O fluxo conceitual sera:

1. o orquestrador identifica o contexto
2. o sistema localiza as regras ativas compativeis com esse contexto
3. as regras sao ordenadas por escopo, prioridade e natureza
4. o motor interpreta essas regras
5. o motor consolida objetivos, restricoes e ajustes de estrategia
6. os parametros finais sao enviados para a calculadora

Nesse desenho:

- a regra nao executa a conta
- a calculadora nao conhece a regra diretamente
- o motor transforma regra em parametro de calculo

### Compatibilidade com a arquitetura e com o sistema atual

Essa proposta conceitual e compativel com os documentos anteriores e com a base atual do projeto pelos seguintes motivos:

**Compatibilidade com a calculadora existente**

- a calculadora atual ja recebe parametros e retorna resultado
- a entidade `regra` apenas organiza como esses parametros serao decididos
- nenhuma alteracao conceitual exige mudar a formula nesta fase

**Compatibilidade com a arquitetura alvo**

- a modelagem respeita a separacao entre persistencia de regras, motor de regras, orquestrador e calculadora
- a regra continua sendo dominio de estrategia, nao componente matematico

**Compatibilidade com o catalogo de regras**

- o campo `tipo` permite representar as familias descritas no catalogo
- o campo `escopo_tipo` permite suportar global, marketplace, categoria e produto
- o campo `parametros` permite acomodar regras diferentes sem perder unidade conceitual
- os campos `prioridade` e `ativo` suportam governanca e combinacao futura

### Resultado esperado desta fase

Ao introduzir a entidade `regra` de forma conceitual, o sistema passa a ter uma linguagem formal para representar estrategia de precificacao.

Isso prepara a base para as fases seguintes sem:

- alterar calculo
- alterar rotas atuais
- alterar banco de dados nesta etapa
- misturar regra com formula

### Limite deste documento

Este documento nao define estrutura de tabelas, nomes de colunas ou modelagem fisica. O ponto principal aqui e registrar que a arquitetura futura depende de uma camada propria de persistencia de regras, separada da calculadora.

## 6. Simulacao de cenarios

A arquitetura futura deve possuir uma camada de simulacao coerente com o motor de precificacao.

### Objetivo da simulacao

O sistema deve permitir:

- simular regras
- testar impacto em precos
- prever lucro e margem antes de aplicar mudancas

### Conceito de simulacao de preco

Simulacao de preco e a capacidade de testar cenarios de precificacao sem alterar os dados reais do sistema.

Isso significa que o usuario deve poder experimentar mudancas de estrategia e observar os efeitos esperados antes de salvar qualquer decisao operacional.

Exemplos de cenarios de simulacao:

- mudanca de margem
- aplicacao de regra de concorrente
- alteracao de custos
- alteracao de regras

### O que uma simulacao pode variar

Uma simulacao pode alterar, de forma temporaria:

- objetivos, como margem alvo ou lucro minimo
- restricoes, como preco minimo ou limite de queda
- custos contextuais, como frete, ads ou custos de fulfillment
- posicionamento de mercado, como seguir concorrente ou ficar abaixo dele
- combinacao e prioridade de regras

### Papel da simulacao na arquitetura

A simulacao nao deve ser um comportamento paralelo e desconectado do motor real. Ela deve reutilizar:

- o mesmo orquestrador de contexto
- o mesmo motor de regras
- a mesma calculadora

O que muda e apenas a intencao de uso:

- na simulacao, o resultado e temporario
- na execucao real, o resultado pode ser persistido

### Fluxo esperado da simulacao

O fluxo conceitual da simulacao deve ser:

`contexto -> orquestrador -> motor de regras -> calculadora -> resultado simulado`

Leitura detalhada:

1. o usuario informa um contexto de simulacao
2. o orquestrador monta o contexto temporario
3. o motor de regras interpreta as regras reais ou hipoteticas do cenario
4. o motor gera parametros finais de calculo
5. a calculadora executa a conta
6. o sistema retorna um resultado simulado sem persistir mudancas reais

### Relacao entre simulacao e arquitetura principal

A simulacao deve usar a mesma arquitetura do motor de precificacao.

Isso e importante porque:

- evita divergencia entre preco simulado e preco real
- reduz duplicidade de logica
- torna a simulacao confiavel
- permite validar regras antes de colocá-las em vigor

### Explicacao do preco para o usuario

O sistema deve ser capaz de explicar ao usuario como o preco foi calculado, tanto na simulacao quanto na execucao real.

Essa explicacao deve apresentar:

- regras encontradas
- regras aplicadas
- regras descartadas
- parametros finais utilizados
- preco, lucro e margem resultantes

### Estrutura esperada da explicacao

A explicacao do preco deve responder, de forma objetiva:

- qual contexto foi considerado
- quais regras estavam disponiveis
- quais regras venceram
- quais regras perderam e por que
- quais parametros chegaram na calculadora
- qual foi o resultado numerico final

### Auditoria do calculo

O sistema deve manter uma trilha de auditoria da decisao de precificacao.

Essa trilha deve registrar:

- contexto utilizado
- regras avaliadas
- regras aplicadas
- parametros finais
- resultado final

### Diferenca entre explicacao e auditoria

Explicacao e auditoria estao relacionadas, mas nao sao a mesma coisa.

**Explicacao**

- foca em tornar a decisao compreensivel para o usuario
- privilegia clareza e resumibilidade

**Auditoria**

- foca em rastreabilidade e reconstrucao do processo
- privilegia completude e capacidade de investigacao

### Como essas informacoes podem ser usadas

Essas informacoes sao essenciais para:

- transparencia ao usuario
- debugging do motor de regras
- analise de decisoes de precificacao

### Transparencia ao usuario

Permite mostrar:

- por que um produto recebeu determinado preco
- qual regra limitou ou elevou o resultado
- como o contexto do canal influenciou a decisao

### Debugging do motor de regras

Permite investigar:

- conflitos de regra mal resolvidos
- parametros incoerentes
- divergencias entre expectativa de negocio e resultado

### Analise de decisoes de precificacao

Permite revisar:

- efeito de politicas aplicadas
- impacto de mudancas de regra
- comportamento do motor em diferentes contextos

### Papel dessas capacidades na arquitetura

Simulacao, explicacao e auditoria nao devem ser tratadas como acessorios opcionais.

Elas fazem parte da confiabilidade do motor de precificacao porque:

- aumentam previsibilidade
- reduzem opacidade
- facilitam evolucao segura
- criam governanca sobre a decisao automatizada

### Beneficios esperados

- maior previsibilidade antes de alterar regras
- comparacao de cenarios
- validacao operacional por parte do usuario
- reducao de risco em alteracoes de estrategia

## 7. Reprecificacao em massa

O sistema deve suportar reprecificacao em massa como parte nativa da arquitetura alvo.

### Capacidades esperadas

O fluxo deve conseguir:

- executar reprecificacao de um produto
- executar reprecificacao de todos os produtos
- executar reprecificacao por marketplace
- executar reprecificacao por categoria
- executar reprecificacao de produtos selecionados

### Tipos de reprecificacao suportados

O sistema deve prever os seguintes tipos de reprecificacao:

**Reprecificacao de um produto**

- usada para ajuste pontual
- adequada para validacao individual ou correcao localizada

**Reprecificacao por marketplace**

- usada quando uma mudanca afeta um canal especifico
- adequada para variacao de taxa, estrategia ou politica daquele marketplace

**Reprecificacao por categoria**

- usada quando uma politica comercial muda para uma familia de produtos
- adequada para ajustes por linha, segmento ou tipo de produto

**Reprecificacao por selecao manual**

- usada quando o usuario escolhe explicitamente um conjunto de produtos
- adequada para testes controlados e operacoes direcionadas

**Reprecificacao de todos os produtos**

- usada quando uma mudanca estrutural afeta toda a operacao
- adequada para revisao ampla de estrategia ou custo base comum

### Gatilhos de reprecificacao

A reprecificacao pode ser iniciada por diferentes eventos de negocio ou operacao.

Exemplos de gatilhos:

- alteracao de regra
- alteracao de taxa
- alteracao de custo
- mudanca de estrategia
- acao manual do usuario

### Leitura conceitual dos gatilhos

**Alteracao de regra**

- quando uma politica de margem, concorrencia, promocao ou restricao muda

**Alteracao de taxa**

- quando custos contextuais do marketplace sao alterados

**Alteracao de custo**

- quando o custo base do produto muda

**Mudanca de estrategia**

- quando um produto ou grupo passa a operar com outra orientacao comercial

**Acao manual do usuario**

- quando o usuario decide recalcular explicitamente um conjunto de itens

### Como isso se encaixa na arquitetura

O mecanismo de reprecificacao em massa nao deve criar uma logica paralela de precificacao.

Ele deve apenas executar, em escala, o mesmo fluxo principal:

1. carregar contexto
2. aplicar regras
3. consolidar parametros
4. executar calculo
5. persistir resultado quando necessario

### Execucao para grandes volumes

Para bases grandes, a reprecificacao nao deve depender de uma unica execucao longa e monolitica.

O sistema deve considerar conceitos como:

- processamento em lotes
- execucao assincrona
- fila de processamento

### Processamento em lotes

O volume total deve poder ser quebrado em subconjuntos menores.

Isso permite:

- reduzir risco de travamento
- melhorar controle operacional
- facilitar retomada em caso de falha
- acompanhar progresso de forma mais clara

### Execucao assincrona

Quando o volume ou impacto operacional for alto, a reprecificacao deve poder ocorrer fora do fluxo imediato da requisicao do usuario.

Isso permite:

- disparar a tarefa sem bloquear a interface
- processar grandes quantidades com mais seguranca
- acompanhar andamento sem depender de uma unica conexao aberta

### Fila de processamento

O sistema deve poder representar a reprecificacao como trabalho pendente de execucao.

Essa ideia permite:

- organizar ordem de execucao
- evitar concorrencia descontrolada
- separar disparo da tarefa de sua execucao
- dar previsibilidade ao processamento em grande escala

### Registro do resultado de cada reprecificacao

O sistema deve registrar o resultado de cada item recalculado dentro da tarefa de reprecificacao.

Para cada produto recalculado, o registro deve incluir:

- produto recalculado
- contexto utilizado
- regras aplicadas
- resultado do calculo

### Detalhamento conceitual do registro por item

O registro por produto deve permitir identificar:

- qual item foi processado
- em qual recorte da tarefa ele entrou
- quais parametros finais foram usados
- qual preco, lucro e margem resultaram
- se houve sucesso, descarte ou erro

### Acompanhamento do progresso da reprecificacao

O sistema deve permitir acompanhar o progresso de uma tarefa de reprecificacao.

Exemplos de informacoes de acompanhamento:

- progresso da tarefa
- quantidade de produtos processados
- possiveis erros

### Informacoes operacionais esperadas

Para cada execucao em massa, o sistema deve poder informar:

- quantidade total prevista
- quantidade ja processada
- quantidade com sucesso
- quantidade com erro
- quantidade ignorada
- status atual da tarefa

### Utilidade do acompanhamento

Esse acompanhamento e importante para:

- dar visibilidade ao usuario
- reduzir percepcao de falha silenciosa
- facilitar suporte operacional
- permitir acao corretiva em caso de erro

### Relacao com a rastreabilidade do motor

A reprecificacao em massa nao deve apenas produzir um novo preco. Ela deve preservar o mesmo nivel de rastreabilidade previsto para a execucao unitaria.

Isso significa que o sistema deve conseguir ligar:

- tarefa de reprecificacao
- item recalculado
- contexto utilizado
- regras aplicadas
- resultado final

### Resultado arquitetural esperado

Isso garante:

- consistencia entre calculo unitario e em lote
- reaproveitamento do motor
- menor duplicidade de regra
- caminho claro para escalar o sistema

## 8. Compatibilidade com o sistema atual

A evolucao para a arquitetura futura deve reaproveitar o maximo possivel do sistema atual, principalmente no que ja funciona como base da precificacao.

### Elementos que podem ser reaproveitados

**Calculo existente**

- a formula atual e um ponto de partida concreto
- `precoService.js` pode continuar representando a camada matematica
- `precificacaoService.js` pode continuar sendo base do recalculo operacional

**Estrutura atual de produtos**

- o cadastro atual de produtos permanece relevante
- custo, preco direto, margem e relacionamentos com marketplaces continuam sendo insumos importantes

**Integracao com marketplaces**

- a estrutura atual por marketplace ja fornece um recorte natural de contexto
- taxas por marketplace continuam sendo base de custos contextuais

### Evolucao incremental

A transicao arquitetural deve ser incremental.

Isso significa:

- preservar o funcionamento atual enquanto novas camadas sao introduzidas
- evitar reescrita abrupta
- reaproveitar a calculadora existente
- acrescentar gradualmente regras, contexto e orquestracao

O objetivo nao e descartar o que existe, mas reorganizar o sistema para permitir crescimento com clareza.

## 9. Governanca e rastreabilidade operacional

O motor de precificacao nao deve evoluir apenas como mecanismo de decisao automatica. Ele tambem precisa ser governavel, auditavel e seguro do ponto de vista operacional.

### Gestao de regras de precificacao

O sistema deve permitir gerenciar regras de forma controlada.

Isso inclui:

- criacao de regras
- edicao de regras
- ativacao e desativacao
- definicao de prioridade

### Criacao de regras

Ao criar uma regra, o sistema deve deixar claro:

- tipo da regra
- escopo
- parametros
- prioridade
- estado inicial

### Edicao de regras

Ao editar uma regra, o sistema deve permitir alterar seu comportamento sem perder rastreabilidade historica.

O objetivo da edicao nao deve ser apenas sobrescrever dados, mas manter a capacidade de entender como a politica de precificacao evoluiu ao longo do tempo.

### Ativacao e desativacao

Uma regra pode existir cadastrada sem estar em vigor.

Esse mecanismo e importante para:

- preparar politicas futuras
- testar estrategias
- interromper efeitos sem apagar historico

### Definicao de prioridade

A prioridade precisa ser tratada como atributo de governanca, nao apenas como detalhe tecnico.

Ela e parte essencial da capacidade do motor de:

- resolver conflitos
- justificar resultados
- manter comportamento previsivel

### Versionamento de regras

Mudancas relevantes em regras devem ser tratadas como eventos versionados.

Quando uma regra for alterada, o sistema deve registrar:

- versao anterior
- nova versao
- data da alteracao
- usuario responsavel

### Finalidade do versionamento

O versionamento e importante para:

- entender a evolucao de uma politica
- reconstituir o contexto de uma decisao passada
- comparar efeitos antes e depois de uma mudanca
- sustentar confiabilidade operacional

### Auditoria operacional

O sistema deve manter auditoria operacional sobre a gestao das regras.

Essa auditoria deve registrar:

- quem alterou uma regra
- quando a alteracao ocorreu
- qual foi a mudanca realizada

### Escopo da auditoria operacional

A auditoria nao deve se limitar ao preco calculado. Ela deve abranger tambem os eventos de administracao do motor, como:

- criacao de regra
- edicao de regra
- ativacao
- desativacao
- mudanca de prioridade

### Mecanismos de seguranca do motor de regras

O motor de regras precisa de mecanismos de seguranca para evitar configuracoes perigosas ou inconsistentes.

Exemplos de seguranca esperada:

- evitar regras que gerem margem negativa
- detectar conflitos entre regras
- validar parametros antes de ativar uma regra

### Evitar regras que gerem margem negativa

Mesmo quando a estrategia for agressiva, o sistema deve impedir configuracoes claramente inviaveis ou tratá-las como excecoes controladas.

### Detectar conflitos entre regras

O sistema deve identificar situacoes como:

- duas regras incompativeis no mesmo escopo
- combinacoes que tornem o resultado incoerente
- sobreposicao indevida de politicas

### Validar parametros antes de ativar uma regra

Antes de uma regra entrar em vigor, o sistema deve poder verificar:

- se os parametros sao validos
- se a combinacao com outras regras e segura
- se a regra e coerente com restricoes fortes do motor

### Criterios de maturidade do motor de precificacao

O motor deve evoluir de forma que consiga absorver crescimento funcional sem perder previsibilidade.

Os criterios de maturidade incluem a capacidade de suportar:

- novos tipos de regras
- novos contextos de precificacao
- novos marketplaces

### Novos tipos de regras

Uma arquitetura madura deve conseguir incorporar novas familias de regra sem exigir reescrita estrutural da calculadora.

### Novos contextos de precificacao

O motor deve conseguir lidar com novas situacoes de negocio, como:

- novas estrategias comerciais
- novos sinais operacionais
- novos fatores de custo contextual

### Novos marketplaces

O sistema deve suportar expansao para novos canais sem precisar acoplar regra diretamente a rota ou formula.

### Sinais de maturidade arquitetural

O motor pode ser considerado mais maduro quando:

- novas regras entram com baixo impacto estrutural
- a rastreabilidade continua clara
- a explicacao do preco permanece compreensivel
- a governanca acompanha o crescimento funcional
- a operacao continua segura sob aumento de volume e complexidade

## Conclusao

A arquitetura alvo do motor de precificacao separa claramente:

- calculo
- regras
- contexto
- execucao

Essa separacao permite que o SaaS evolua de um calculador parametrizado por marketplace para um motor de regras de precificacao mais completo, explicavel e escalavel.

Na visao futura:

- a calculadora continua responsavel pela matematica
- o motor de regras define a estrategia
- o orquestrador consolida contexto e resolve conflitos
- a execucao pode ocorrer de forma unitaria, simulada ou em massa

Esse desenho cria base para evolucao do produto sem concentrar logica de negocio em pontos espalhados da aplicacao.
