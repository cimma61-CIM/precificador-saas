# 04. Catalogo de Regras

## Objetivo do documento

Este documento define o catalogo inicial de regras de precificacao que o SaaS devera suportar futuramente.

O foco aqui e funcional e conceitual. Este material nao define implementacao tecnica, tabelas, APIs ou detalhes de codigo. O objetivo e deixar claro quais tipos de regras o sistema precisara entender para operar como um motor de regras de precificacao.

Cada regra descrita abaixo representa uma direcao de negocio que podera influenciar o preco final. O papel do motor sera interpretar essas regras, resolver conflitos e determinar os parametros finais que serao enviados para a calculadora matematica.

## 1. Regras base de rentabilidade

As regras base de rentabilidade existem para proteger a viabilidade economica da operacao e orientar o preco em funcao de objetivos financeiros minimos.

### Margem desejada

**Objetivo da regra**

Definir a margem percentual alvo que o sistema deve buscar ao precificar o produto.

**Entrada necessaria**

- margem percentual desejada
- contexto de aplicacao da regra

**Impacto no calculo de preco**

- influencia diretamente o preco alvo
- quanto maior a margem desejada, maior tende a ser o preco final

**Possiveis conflitos com outras regras**

- preco maximo
- seguir concorrente
- ficar abaixo do concorrente
- promocao
- estrategia de escala

**Observacoes de uso no contexto de marketplace**

- pode variar por marketplace, pois cada canal possui custo e dinamica diferentes
- deve ser tratada como objetivo, nao como restricao absoluta

### Lucro minimo

**Objetivo da regra**

Garantir que cada venda entregue um valor minimo absoluto de lucro.

**Entrada necessaria**

- valor minimo de lucro por unidade
- contexto de aplicacao

**Impacto no calculo de preco**

- cria um piso de rentabilidade em valor absoluto
- pode elevar o preco mesmo quando a margem percentual ja parecer aceitavel

**Possiveis conflitos com outras regras**

- preco maximo
- seguir concorrente
- ficar abaixo do concorrente
- promocao

**Observacoes de uso no contexto de marketplace**

- e especialmente relevante em canais com ticket baixo e taxas altas
- nao substitui a margem desejada; complementa a protecao financeira

### Preco minimo

**Objetivo da regra**

Impedir que o preco final fique abaixo de um limite minimo definido.

**Entrada necessaria**

- valor do preco minimo
- contexto de aplicacao

**Impacto no calculo de preco**

- atua como piso absoluto do preco final
- pode sobrescrever estrategias de queda de preco

**Possiveis conflitos com outras regras**

- seguir concorrente para baixo
- ficar X abaixo do concorrente
- promocao
- estrategia de escala

**Observacoes de uso no contexto de marketplace**

- pode ser importante em canais com guerra de preco
- pode variar por marketplace por causa de custos contextuais distintos

### Preco maximo

**Objetivo da regra**

Impedir que o preco final ultrapasse um limite considerado comercialmente aceitavel.

**Entrada necessaria**

- valor do preco maximo
- contexto de aplicacao

**Impacto no calculo de preco**

- atua como teto do preco final
- pode limitar estrategias de alta margem quando o mercado nao suporta o preco

**Possiveis conflitos com outras regras**

- margem desejada
- lucro minimo
- custos contextuais elevados

**Observacoes de uso no contexto de marketplace**

- relevante quando o canal possui teto competitivo claro
- pode indicar inviabilidade economica em determinados cenarios

### Nao vender com margem negativa

**Objetivo da regra**

Evitar que o sistema aprove ou sugira preco com prejuizo operacional.

**Entrada necessaria**

- custo base
- custos contextuais
- criterio de margem real

**Impacto no calculo de preco**

- impede que o preco final produza margem negativa
- pode bloquear precos agressivos demais

**Possiveis conflitos com outras regras**

- seguir concorrente
- ficar abaixo do concorrente
- promocao agressiva
- estrategia de escala

**Observacoes de uso no contexto de marketplace**

- deve ser tratada como restricao forte em ambientes com taxas variaveis
- evita precificacao irresponsavel em canais onde o custo total varia muito

## 2. Regras de posicionamento de mercado

As regras de posicionamento de mercado definem como o preco deve se comportar em relacao a referencia competitiva externa.

### Seguir concorrente

**Objetivo**

Posicionar o preco igual ao valor praticado por um concorrente de referencia.

**Parametros necessarios**

- preco do concorrente
- identificacao da referencia concorrente
- contexto do marketplace

**Impacto no calculo**

- define um alvo competitivo externo
- pode substituir ou modular o preco sugerido pela estrategia base

**Conflitos possiveis**

- preco minimo
- lucro minimo
- nao vender com margem negativa
- preco maximo

**Observacoes**

- a regra depende da confiabilidade da referencia concorrente
- nao deve ignorar restricoes de rentabilidade

### Ficar X abaixo do concorrente

**Objetivo**

Posicionar o preco abaixo do concorrente em valor absoluto ou percentual.

**Parametros necessarios**

- preco do concorrente
- delta monetario ou percentual
- contexto do marketplace

**Impacto no calculo**

- reduz o preco final em relacao ao benchmark competitivo
- aumenta agressividade comercial

**Conflitos possiveis**

- preco minimo
- lucro minimo
- margem desejada
- nao vender com margem negativa

**Observacoes**

- deve deixar claro se o delta e em moeda ou percentual
- em marketplaces, pequenas diferencas podem ter impacto grande de conversao

### Ficar X acima do concorrente

**Objetivo**

Posicionar o preco acima do concorrente em valor absoluto ou percentual.

**Parametros necessarios**

- preco do concorrente
- delta monetario ou percentual
- contexto do marketplace

**Impacto no calculo**

- eleva o preco em relacao ao benchmark
- pode sustentar posicionamento premium ou absorcao de custos mais altos

**Conflitos possiveis**

- preco maximo
- estrategia de escala
- promocao

**Observacoes**

- pode ser valido quando ha diferencial percebido no canal
- exige cuidado para nao perder competitividade sem justificativa

### Acompanhar concorrente ate atingir margem minima

**Objetivo**

Permitir que o preco acompanhe o mercado somente ate o limite em que a margem minima continue respeitada.

**Parametros necessarios**

- preco do concorrente
- margem minima
- custo base
- custos contextuais

**Impacto no calculo**

- combina competitividade com protecao financeira
- tenta aproximar o preco do concorrente sem ultrapassar limite de rentabilidade

**Conflitos possiveis**

- seguir concorrente integralmente
- promocao agressiva
- lucro minimo

**Observacoes**

- e uma regra de mercado com restricao embutida
- muito util em canais com forte pressao competitiva

### Limitar queda de preco

**Objetivo**

Impedir que o sistema reduza o preco alem de um limite de seguranca, mesmo diante de pressao competitiva.

**Parametros necessarios**

- percentual maximo de queda
- valor minimo de reducao permitido
- janela ou referencia de comparacao

**Impacto no calculo**

- restringe a agressividade de ajustes para baixo
- preserva estabilidade de margem e posicionamento

**Conflitos possiveis**

- seguir concorrente
- ficar abaixo do concorrente
- promocao

**Observacoes**

- e relevante para evitar espiral de guerra de preco
- pode ser importante em marketplaces altamente sensiveis a precificacao

## 3. Regras contextuais de estrategia

As regras contextuais de estrategia adaptam o comportamento da precificacao conforme a fase do produto, objetivo comercial ou modo operacional.

### Produto novo

**Objetivo**

Aplicar uma estrategia especifica para produtos em fase inicial de entrada no mercado.

**Como pode alterar a estrategia**

- pode reduzir margem alvo
- pode flexibilizar posicionamento de preco
- pode incentivar maior competitividade inicial

**Custos e posicionamento envolvidos**

- normalmente nao altera custo base
- pode alterar objetivo de margem e posicionamento competitivo

**Conflitos possiveis**

- lucro minimo
- preco minimo
- regra de premiumizacao

**Observacoes**

- deve ter criterio temporal claro
- o estado de produto novo nao deve ser permanente

### Produto para escalar vendas

**Objetivo**

Aplicar estrategia voltada a ganho de volume, participacao ou giro.

**Como pode alterar a estrategia**

- reduz margem alvo
- aumenta tolerancia a posicionamento mais agressivo
- pode aproximar o preco do mercado

**Custos e posicionamento envolvidos**

- normalmente mantem custo base
- altera objetivo comercial e posicionamento

**Conflitos possiveis**

- margem desejada alta
- lucro minimo
- preco minimo

**Observacoes**

- e uma estrategia valida, mas precisa de restricoes para nao sacrificar rentabilidade sem controle

### Produto com campanhas de ads

**Objetivo**

Incorporar o efeito de investimento em publicidade na estrategia de precificacao.

**Como pode alterar a estrategia**

- pode reduzir margem disponivel
- pode exigir aumento de preco
- pode mudar a leitura de rentabilidade do canal

**Custos e posicionamento envolvidos**

- pode acrescentar custo contextual
- pode alterar o equilibrio entre competitividade e margem

**Conflitos possiveis**

- seguir concorrente
- preco maximo
- promocao

**Observacoes**

- no contexto de marketplace, ads tende a alterar diretamente a sustentabilidade da operacao

### Produto em promocao

**Objetivo**

Aplicar politica temporaria de reducao de preco por campanha comercial.

**Como pode alterar a estrategia**

- reduz preco alvo
- pode flexibilizar margem desejada
- pode priorizar conversao no curto prazo

**Custos e posicionamento envolvidos**

- pode manter custos iguais
- altera diretamente posicionamento de preco

**Conflitos possiveis**

- preco minimo
- lucro minimo
- nao vender com margem negativa

**Observacoes**

- deve ser temporal e controlada
- o sistema precisa distinguir promocao planejada de distorcao permanente de preco

### Produto em marketplace com fulfillment

**Objetivo**

Aplicar estrategia especifica para produtos operados em modelo de fulfillment, como Full ou FBA.

**Como pode alterar a estrategia**

- pode alterar margem alvo
- pode mudar posicionamento competitivo
- pode incorporar custos adicionais ou ganhos operacionais

**Custos e posicionamento envolvidos**

- pode alterar custos contextuais
- pode justificar preco diferente no mesmo marketplace

**Conflitos possiveis**

- regra geral do canal
- preco maximo
- seguir concorrente sem considerar diferencas operacionais

**Observacoes**

- fulfillment pode mudar custo, prazo e conversao
- o motor deve permitir refletir esse contexto sem distorcer a calculadora

### Conflitos possiveis entre estrategias contextuais

As estrategias contextuais podem entrar em conflito entre si. Exemplos:

- produto novo versus produto com alta margem alvo
- produto para escalar versus lucro minimo elevado
- produto em promocao versus nao vender com margem negativa
- produto com ads versus seguir concorrente para baixo
- fulfillment versus regra generica do canal

Esses conflitos reforcam a necessidade de um motor de regras que consiga avaliar contexto e prioridade, em vez de depender de `ifs` espalhados.

## 4. Escopo das regras

As regras podem existir em diferentes niveis de aplicacao. O motor deve considerar que uma mesma familia de regra pode ser configurada em escopos diferentes.

### Escopos suportados

**Global**

- vale para toda a operacao do usuario
- representa politica geral de precificacao

**Marketplace**

- vale apenas para um canal especifico
- adapta a estrategia a custos e dinamica do marketplace

**Categoria**

- vale para um grupo de produtos com comportamento semelhante
- permite padronizacao de politicas por familia

**Produto**

- vale apenas para um item especifico
- permite ajustes finos e excecoes

### Prioridade entre escopos

Como principio inicial, a prioridade entre escopos deve seguir esta ordem:

`produto > categoria > marketplace > global`

Isso significa:

- a regra mais especifica tende a prevalecer sobre a mais ampla
- a regra global funciona como base
- regras mais detalhadas refinam ou substituem a politica geral

### Resolucao de conflitos entre escopos diferentes

Quando houver conflito entre regras equivalentes em escopos diferentes, o sistema deve considerar:

- especificidade do escopo
- natureza da regra
- prioridade definida
- restricoes que nao podem ser violadas

Observacoes importantes:

- uma regra de produto pode sobrescrever uma regra global de margem desejada
- uma restricao forte, como nao vender com margem negativa, nao deve ser ignorada apenas por existir uma regra mais especifica
- o motor deve conseguir explicar por que uma regra de escopo menor prevaleceu ou por que foi bloqueada por uma restricao superior

## 5. Regras avancadas

As regras avancadas definem capacidades de governanca e sofisticacao do motor, e nao apenas comportamentos isolados de preco.

### Regra personalizada criada pelo usuario

**Objetivo**

Permitir que o usuario crie politicas fora do conjunto padrao do catalogo.

**Como o usuario pode usar**

- para adaptar o motor a politicas comerciais proprias
- para criar excecoes controladas
- para refletir estrategias especificas do negocio

**Impacto no comportamento do motor de precificacao**

- amplia a flexibilidade do motor
- exige mecanismo claro de validacao, prioridade e explicacao

### Ativar ou desativar regras

**Objetivo**

Permitir que uma regra exista no sistema sem estar necessariamente em vigor.

**Como o usuario pode usar**

- testar politicas
- desligar regras temporariamente
- controlar campanhas e periodos especificos

**Impacto no comportamento do motor de precificacao**

- define se a regra participa ou nao da decisao
- melhora governanca e operacao do catalogo

### Prioridade entre regras

**Objetivo**

Definir qual regra deve prevalecer quando duas ou mais regras apontarem para resultados diferentes.

**Como o usuario pode usar**

- organizar ordem de importancia entre politicas
- definir precedencia entre estrategias

**Impacto no comportamento do motor de precificacao**

- influencia diretamente a decisao final
- reduz comportamento ambiguo do motor

### Combinacao de regras

**Objetivo**

Permitir que multiplas regras participem da formacao do preco ao mesmo tempo.

**Como o usuario pode usar**

- combinar objetivo financeiro com posicionamento de mercado
- aplicar restricoes junto de estrategias contextuais

**Impacto no comportamento do motor de precificacao**

- torna o motor mais poderoso e realista
- exige consolidacao clara dos efeitos de cada regra

### Explicacao do preco

**Objetivo**

Permitir que o sistema explique ao usuario por que um preco foi definido.

**Como o usuario pode usar**

- entender a estrategia aplicada
- auditar decisoes
- revisar conflitos e limites da precificacao

**Impacto no comportamento do motor de precificacao**

- torna o motor auditavel e confiavel
- exige que a decisao seja rastreavel e justificavel

## Conclusao

O catalogo inicial proposto estabelece que o sistema deve evoluir para funcionar como um motor de regras de precificacao, e nao apenas como um calculador simples.

Nesse modelo:

- as regras definem a estrategia de preco
- o motor de regras decide quais regras se aplicam e quais parametros devem ser usados
- a calculadora existente continua responsavel apenas pelo calculo matematico

Em outras palavras, a calculadora permanece como o componente que executa a conta, enquanto o motor de regras define quais entradas devem chegar nela com base em rentabilidade, mercado, contexto e escopo.
