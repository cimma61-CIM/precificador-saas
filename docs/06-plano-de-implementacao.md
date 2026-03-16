# 06. Plano de Implementacao

## Objetivo do documento

Definir um plano de evolucao em fases para transformar o sistema atual de precificacao em um motor de regras de precificacao, preservando a base existente e reduzindo risco de regressao.

Este documento nao implementa nada. Ele organiza a sequencia de evolucao do produto e da arquitetura para que a transicao aconteca com clareza, previsibilidade e compatibilidade com o que ja existe hoje.

## Estrategia de evolucao

A evolucao deve ser incremental.

O principio geral do plano e:

1. consolidar o que ja funciona hoje
2. introduzir conceitos novos sem quebrar o fluxo atual
3. separar gradualmente calculo, regras, contexto e execucao
4. ampliar capacidade de simulacao, explicacao e reprecificacao

O sistema nao deve saltar diretamente de um calculador parametrizado para um motor completo sem etapas intermediarias. A base atual precisa ser estabilizada e reaproveitada.

## Fase 1 - Consolidacao do calculo atual

### Objetivo

Garantir que o calculo existente seja estavel, compreensivel e reutilizavel como base do novo motor.

### O que esta fase deve cobrir

- revisao da calculadora existente
- confirmacao das entradas e saidas do calculo
- garantia de compatibilidade com marketplaces atuais

### Direcao da fase

Nesta fase, o foco nao e mudar a estrategia de precificacao. O foco e consolidar a base matematica que ja existe.

Isso significa validar com clareza:

- quais parametros entram na calculadora
- quais resultados ela retorna
- quais validacoes ela executa
- quais casos geram falha ou inviabilidade
- como o calculo atual se comporta por marketplace

### Resultado esperado

Ao final desta fase, o sistema deve ter uma camada de calculo claramente reconhecida como componente reaproveitavel, com comportamento conhecido e compativel com os marketplaces ja operados.

## Fase 2 - Introducao da entidade de regras

### Objetivo

Permitir que o sistema passe a reconhecer regra de precificacao como um conceito proprio de dominio.

### O que esta fase deve cobrir

- conceito de regra
- parametros da regra
- escopo da regra
- estado da regra, ativa ou inativa

### Direcao da fase

Nesta fase, a preocupacao principal e criar a base conceitual para que a estrategia de precificacao deixe de ficar implicita em campos soltos ou comportamentos espalhados.

Uma regra deve passar a ser entendida como um elemento de negocio com:

- identidade
- tipo
- objetivo
- parametros
- escopo
- prioridade
- status

### Modelo conceitual minimo da regra

Sem definir implementacao fisica nesta etapa, a entidade de regra deve ser entendida como contendo, no minimo:

- identificador
- nome
- descricao
- tipo de regra
- grupo da regra
- escopo da regra
- referencia do escopo
- parametros da regra
- prioridade
- estado ativo ou inativo
- vigencia opcional

### Uso futuro da entidade pelo motor de regras

Esta fase deve deixar claro que a entidade `regra` sera, futuramente, a entrada principal do motor de regras.

O papel dessa entidade sera:

- representar estrategia de negocio
- indicar em que contexto a regra vale
- carregar os parametros necessarios para a decisao
- permitir ordenacao por prioridade
- permitir ativacao e desativacao sem alterar formula

### Compatibilidade exigida nesta fase

A proposta da entidade `regra` deve permanecer compativel com:

- a calculadora existente
- a arquitetura alvo definida para o motor
- o catalogo de regras documentado

Isso significa que a entidade de regra nao deve:

- acoplar calculo com estrategia
- obrigar mudanca imediata na formula
- depender de alteracao das rotas atuais
- exigir mudanca de banco nesta etapa documental

### Resultado esperado

Ao final desta fase, o sistema deve ter um modelo conceitual claro para representar regras de precificacao, sem ainda depender de um motor completo para sua orquestracao.

## Fase 3 - Suporte a escopos de regra

### Objetivo

Permitir que as regras sejam aplicadas em diferentes niveis da operacao.

### Escopos que esta fase deve cobrir

- global
- marketplace
- categoria
- produto

### Direcao da fase

O sistema deve evoluir para reconhecer que a mesma familia de regra pode existir com abrangencias diferentes.

Exemplos:

- uma margem desejada global
- uma margem especifica por marketplace
- uma politica de categoria
- uma excecao por produto

### Resolucao de conflitos entre escopos

O sistema deve adotar uma regra clara de precedencia entre escopos.

Como principio inicial:

`produto > categoria > marketplace > global`

Isso significa:

- a regra mais especifica tende a prevalecer sobre a mais ampla
- a regra global funciona como base
- regras mais especificas refinam ou substituem a politica geral

### Motivo da prioridade entre escopos

O motivo dessa ordem e simples: o escopo mais especifico tende a representar melhor o contexto real da decisao de preco.

Assim:

- o nivel global define a base
- o marketplace adapta a politica ao canal
- a categoria ajusta a politica ao grupo de produtos
- o produto representa a excecao mais precisa

### Resolucao de conflitos no mesmo escopo

Quando houver conflito entre regras equivalentes no mesmo escopo, o sistema deve considerar criterios adicionais.

Exemplo:

- duas regras de margem para o mesmo marketplace

Nesses casos, a resolucao deve seguir, conceitualmente:

1. prioridade numerica
2. regra mais especifica
3. regra mais recente

### Combinacao de regras

Esta fase tambem deve preparar o sistema para reconhecer que regras podem ser combinadas.

Exemplo:

- regra de margem
- regra de concorrente
- regra de preco minimo

O principio e que regras de naturezas diferentes nao precisam necessariamente competir. Elas podem atuar em camadas diferentes da decisao:

- uma define objetivo
- outra ajusta posicionamento
- outra impoe restricao

### Registro das regras aplicadas

Mesmo antes da implementacao do motor, esta fase deve deixar definido que o sistema precisara registrar:

- quais regras foram encontradas
- quais regras foram aplicadas
- quais foram descartadas
- por que cada decisao foi tomada

Esse registro e essencial para:

- explicacao do preco ao usuario
- auditoria do motor de regras

### Observacoes importantes

- restricoes fortes nao devem ser ignoradas apenas porque uma regra mais especifica existe
- conflitos entre regras equivalentes devem ser resolvidos de forma explicavel
- o sistema deve conseguir mostrar por que determinada regra venceu

### Resultado esperado

Ao final desta fase, o sistema deve estar conceitualmente preparado para localizar regras em diferentes niveis de aplicacao e compor sua precedencia.

## Fase 4 - Introducao do motor de regras

### Objetivo

Criar o componente responsavel por interpretar regras e gerar parametros para a calculadora.

### O que esta fase deve cobrir

- papel do motor de regras
- interacao com a calculadora
- uso do contexto do produto

### Papel do motor de regras

O motor de regras deve:

- interpretar regras aplicaveis
- consolidar objetivos
- consolidar restricoes
- definir parametros finais de precificacao

Ele nao deve executar o calculo matematico em si.

### Relacao com a calculadora

Nesta arquitetura:

- o motor decide a estrategia
- a calculadora executa a conta

O motor de regras prepara a entrada da calculadora com base em:

- escopo
- contexto
- prioridade
- combinacao de regras

### Interface conceitual entre os componentes

Esta fase deve documentar explicitamente a interface entre:

- orquestrador de contexto
- motor de regras
- calculadora de preco

O principio e que cada componente receba um tipo de entrada diferente e devolva uma saida coerente com sua responsabilidade.

### Fluxo esperado

O fluxo conceitual esperado e:

`produto -> orquestrador -> motor de regras -> calculadora -> resultado`

### Dados de entrada e saida do orquestrador

O orquestrador deve receber:

- produto ou lote
- dados de contexto
- regras candidatas

O orquestrador deve devolver:

- contexto consolidado
- regras aplicaveis
- conflitos de escopo resolvidos

### Dados de entrada e saida do motor de regras

O motor deve receber:

- contexto consolidado
- regras aplicaveis
- prioridades e restricoes relevantes

O motor deve devolver:

- parametros finais de calculo
- regras aplicadas
- regras descartadas
- justificativa da consolidacao

### Dados de entrada e saida da calculadora

A calculadora deve receber:

- custos base
- custos contextuais
- objetivos
- restricoes convertidas em parametros compativeis com o calculo

A calculadora deve devolver:

- preco sugerido
- lucro esperado
- margem real
- composicao numerica do resultado

### Transformacao de regra em parametro

Esta fase tambem deve deixar documentado que o motor nao envia regra diretamente para a calculadora.

Ele transforma:

- regras de objetivo em metas de calculo
- regras de mercado em ajustes
- regras restritivas em limites
- regras contextuais em variacoes de custo ou estrategia

### Registro da execucao

O desenho desta fase deve prever que cada execucao de precificacao precise registrar:

- regras aplicadas
- parametros utilizados
- resultado final do calculo

Esse registro sustentara explicabilidade e auditoria nas fases seguintes.

### Uso do contexto do produto

O motor deve considerar, no minimo:

- produto
- marketplace
- categoria
- estrategia comercial

Conforme a evolucao do sistema, tambem podera considerar:

- promocao
- ads
- fulfillment
- concorrencia

### Resultado esperado

Ao final desta fase, o sistema deve possuir uma camada clara de decisao de estrategia separada da camada de calculo.

## Fase 5 - Simulacao e explicacao do preco

### Objetivo

Permitir ao usuario entender como o preco foi formado e prever efeitos antes de aplicar mudancas.

### O que esta fase deve cobrir

- simulacao de cenarios
- explicacao das regras aplicadas
- analise de impacto de mudancas

### Direcao da fase

O sistema deve permitir testar cenarios sem persistir alteracoes reais.

Essa simulacao deve usar o mesmo raciocinio do fluxo principal de precificacao para responder perguntas como:

- qual seria o preco com outra margem
- qual seria o efeito de uma regra promocional
- como a mudanca de uma politica impactaria lucro e margem
- quais regras influenciaram o resultado

### Conceito de simulacao

A simulacao deve ser entendida como uma execucao temporaria da arquitetura de precificacao, sem efeito sobre os dados reais.

Ela deve permitir testar, por exemplo:

- mudanca de margem
- aplicacao de regra de concorrente
- alteracao de custos
- alteracao de regras

### Fluxo esperado da simulacao

O fluxo conceitual esperado e:

`contexto -> orquestrador -> motor de regras -> calculadora -> resultado simulado`

Isso garante que a simulacao use o mesmo raciocinio do motor real, mudando apenas o fato de que o resultado nao sera persistido.

### Explicacao do preco

O usuario deve conseguir entender:

- quais regras foram aplicadas
- quais parametros finais chegaram na calculadora
- qual foi o preco resultante
- quais limites impediram precos mais altos ou mais baixos

### Conteudo esperado da explicacao

O sistema deve registrar e apresentar:

- regras encontradas
- regras aplicadas
- regras descartadas
- parametros finais utilizados
- preco, lucro e margem resultantes

### Conceito de auditoria do calculo

Esta fase tambem deve deixar definido que o sistema precisara manter trilha de auditoria da decisao de precificacao.

Essa trilha deve registrar:

- contexto utilizado
- regras avaliadas
- regras aplicadas
- parametros finais
- resultado final

### Uso dessas informacoes

Essas informacoes devem servir para:

- transparencia ao usuario
- debugging do motor de regras
- analise de decisoes de precificacao

### Resultado esperado

Ao final desta fase, o sistema deve oferecer previsibilidade e explicabilidade, reduzindo a opacidade da decisao de precificacao.

## Fase 6 - Reprecificacao em massa

### Objetivo

Permitir aplicar regras a grandes volumes de produtos de forma controlada.

### O que esta fase deve cobrir

- reprecificacao de um produto
- reprecificacao por marketplace
- reprecificacao por categoria
- reprecificacao de produtos selecionados
- reprecificacao total da base

### Tipos de reprecificacao suportados

O sistema deve prever, conceitualmente:

- reprecificacao de um produto
- reprecificacao por marketplace
- reprecificacao por categoria
- reprecificacao por selecao manual
- reprecificacao de todos os produtos

### Gatilhos da reprecificacao

A reprecificacao deve poder ser iniciada por eventos como:

- alteracao de regra
- alteracao de taxa
- alteracao de custo
- mudanca de estrategia
- acao manual do usuario

### Direcao da fase

O fluxo em massa deve reutilizar a mesma arquitetura do fluxo unitario:

1. carregar contexto
2. localizar regras aplicaveis
3. resolver conflitos
4. gerar parametros finais
5. executar calculo
6. registrar resultados

### Execucao para grandes volumes

Esta fase tambem deve deixar documentado que a reprecificacao em massa precisa ser desenhada para volume.

Por isso, o sistema deve considerar:

- processamento em lotes
- execucao assincrona
- fila de processamento

### Registro do resultado por item

Para cada produto recalculado, o sistema deve registrar:

- produto recalculado
- contexto utilizado
- regras aplicadas
- resultado do calculo

### Acompanhamento de progresso

O sistema deve permitir acompanhar a tarefa de reprecificacao com informacoes como:

- progresso da tarefa
- quantidade de produtos processados
- possiveis erros

### Resultado esperado

Ao final desta fase, o sistema deve estar preparado para operar em volume, mantendo consistencia entre a precificacao individual e a precificacao em lote.

## Fase 7 - Governanca e maturidade operacional

### Objetivo

Consolidar o motor de regras como componente confiavel, auditavel e operavel em ambiente real.

### O que esta fase deve cobrir

- rastreabilidade das decisoes
- visibilidade de regras ativas
- operacao segura de mudancas
- confianca no comportamento do motor

### Gestao de regras

Esta fase deve documentar como o sistema deve permitir:

- criacao de regras
- edicao de regras
- ativacao e desativacao
- definicao de prioridade

### Versionamento de regras

Mudancas em regras devem registrar, conceitualmente:

- versao anterior
- nova versao
- data da alteracao
- usuario responsavel

### Auditoria operacional

O sistema deve registrar, conceitualmente:

- quem alterou uma regra
- quando a alteracao ocorreu
- qual foi a mudanca realizada

### Mecanismos de seguranca do motor

Esta fase tambem deve definir mecanismos de seguranca como:

- evitar regras que gerem margem negativa
- detectar conflitos entre regras
- validar parametros antes de ativar uma regra

### Criterios de maturidade do motor

O motor deve evoluir para suportar, com estabilidade:

- novos tipos de regras
- novos contextos de precificacao
- novos marketplaces

### Direcao da fase

Depois que a base funcional estiver pronta, o sistema deve amadurecer em governanca.

Isso inclui:

- clareza sobre quais regras estao em vigor
- explicacao do resultado para usuario e operacao
- capacidade de revisar efeitos de mudanca
- estabilidade para suportar uso continuo em escala

### Resultado esperado

Ao final desta fase, o motor deixa de ser apenas um mecanismo funcional e passa a operar como uma camada confiavel de decisao de negocio.

## Entregas por fase

### Fase 1

- entendimento consolidado da calculadora atual
- definicao clara de entradas, saidas e restricoes
- confirmacao de compatibilidade com marketplaces atuais

### Fase 2

- definicao funcional da entidade de regra
- definicao dos atributos conceituais da regra
- separacao entre regra e calculo

### Fase 3

- definicao de escopos suportados
- politica inicial de precedencia entre escopos
- criterio de resolucao de conflitos entre niveis

### Fase 4

- definicao clara do motor de regras
- separacao entre motor e calculadora
- definicao do uso de contexto para precificacao

### Fase 5

- estrategia de simulacao coerente com o motor
- explicacao do preco para o usuario
- base para analise de impacto

### Fase 6

- estrategia de reprecificacao em massa
- reutilizacao do mesmo fluxo do motor em volume
- suporte conceitual a varios recortes de execucao

### Fase 7

- visao de governanca do motor
- capacidade de operacao segura
- consolidacao da explicabilidade

## Dependencias tecnicas

O plano depende de alguns alinhamentos tecnicos e funcionais, mesmo sem definir implementacao neste momento:

- estabilizacao da calculadora atual
- definicao clara do catalogo de regras
- definicao do conceito de contexto
- clareza sobre precedencia entre regras
- estrategia de compatibilidade incremental com o fluxo atual

## Riscos e mitigacoes

### Risco: misturar estrategia com calculo

**Impacto**

- o sistema permanece acoplado e dificil de evoluir

**Mitigacao**

- manter a calculadora separada do motor de regras

### Risco: criar regras dispersas em varios pontos do sistema

**Impacto**

- aumento de complexidade
- contradicoes entre backend e frontend

**Mitigacao**

- centralizar interpretacao de regras em uma camada propria

### Risco: crescer sem explicabilidade

**Impacto**

- dificuldade de suporte, auditoria e confianca do usuario

**Mitigacao**

- incluir simulacao e explicacao como parte do plano, nao como etapa secundaria opcional

### Risco: romper compatibilidade com o sistema atual

**Impacto**

- regressao operacional
- perda de confianca no processo de precificacao

**Mitigacao**

- evolucao incremental com reaproveitamento da base atual

## Criterios de pronto

Cada fase deve ser considerada pronta quando:

- seu objetivo funcional estiver claro e delimitado
- a separacao de responsabilidades estiver preservada
- a fase seguinte puder reaproveitar o resultado sem retrabalho estrutural
- houver compatibilidade com a estrategia geral da arquitetura alvo

## Estrategia de testes

Mesmo sem definir implementacao neste documento, a evolucao futura deve considerar validacao em varios niveis:

- validacao da calculadora matematica
- validacao da interpretacao das regras
- validacao da resolucao de conflitos
- validacao de simulacao
- validacao de reprecificacao em massa

O principio geral e que cada nova camada adicionada ao sistema deve ser validada sem comprometer a previsibilidade do calculo.

## Plano de rollout

O rollout futuro deve acompanhar a mesma logica incremental do plano:

- primeiro consolidar a base atual
- depois introduzir regras como conceito
- em seguida introduzir escopos e contexto
- depois ativar o motor de regras
- por fim ampliar simulacao, explicacao e escala

Essa sequencia reduz risco e permite evolucao progressiva do sistema para o modelo de motor de regras de precificacao.
