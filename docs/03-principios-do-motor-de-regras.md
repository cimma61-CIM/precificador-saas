# 03. Principios do Motor de Regras

## Objetivo do documento

Definir os principios arquiteturais que devem orientar a evolucao do futuro motor de precificacao do projeto `precificador-saas`.

Este documento nao descreve implementacao. Ele estabelece criterios de desenho, responsabilidades e limites entre componentes, para evitar que a evolucao do sistema aconteca de forma desorganizada.

## Visao geral

O futuro motor de precificacao deve ser construído com separacao clara entre:

- calculo matematico
- decisao de estrategia
- selecao de regras aplicaveis
- explicacao do resultado

O objetivo e impedir que a logica de precificacao fique distribuida em rotas, telas, `ifs` soltos ou comportamentos duplicados em diferentes camadas do sistema.

## Principios funcionais

### 1. A calculadora faz apenas matematica

A calculadora deve ser um componente responsavel apenas por transformar entradas numericas em saidas numericas.

Ela nao deve:

- decidir qual regra vence
- escolher estrategia comercial
- conhecer contexto de produto, canal, categoria ou concorrencia
- decidir quando aplicar excecoes de negocio

Ela deve apenas receber parametros ja definidos e retornar resultados como:

- preco sugerido
- lucro esperado
- margem real
- composicao do calculo

Em outras palavras, a calculadora e um componente deterministico e matematico.

### 2. O motor de regras decide estrategia e parametros

O motor de regras deve ser responsavel por decidir como o preco sera calculado do ponto de vista de negocio.

Isso inclui decidir:

- qual objetivo deve ser priorizado
- qual margem alvo usar
- se existe preco minimo aplicavel
- se existe restricao comercial para aquele contexto
- quais parametros devem ser enviados para a calculadora

O motor de regras nao substitui a calculadora. Ele prepara a decisao de negocio que sera executada matematicamente.

### 3. O orquestrador decide quais regras se aplicam conforme o contexto

Deve existir uma camada de orquestracao responsavel por avaliar o contexto e selecionar o conjunto de regras aplicavel.

Esse contexto pode incluir, por exemplo:

- produto
- marketplace
- categoria
- origem da operacao
- condicao comercial
- politica ativa
- concorrencia
- perfil do usuario

O orquestrador deve:

- reunir contexto
- localizar regras candidatas
- ordenar prioridade
- resolver conflitos
- acionar o motor de regras
- entregar um resultado final estruturado

O orquestrador nao deve ser confundido com rota HTTP, controller ou tela.

### 4. Regras nao devem ficar hardcoded em rotas, frontend ou ifs espalhados

O sistema nao deve evoluir para um modelo em que cada nova regra seja implementada por:

- `if` dentro de rotas
- validacoes dispersas em services sem padrao
- logica duplicada no frontend
- ajustes pontuais em endpoints especificos

Esse tipo de crescimento gera:

- acoplamento alto
- baixa previsibilidade
- dificuldade de manutencao
- contradicoes entre telas e backend
- risco de regressao

As regras devem existir em uma camada propria, com responsabilidades claras e comportamento centralizado.

## Principios tecnicos

### 5. O sistema deve ser auditavel e explicavel ao usuario

Toda decisao de precificacao deve poder ser explicada.

O sistema deve ser capaz de responder, de forma clara:

- qual preco foi calculado
- quais regras foram aplicadas
- quais parametros foram usados
- quais restricoes limitaram o resultado
- por que um preco foi escolhido e nao outro

Auditabilidade nao e apenas log tecnico. E capacidade de reconstruir a decisao de negocio.

Explicabilidade significa que o usuario deve conseguir entender:

- o racional da precificacao
- a composicao do preco
- as regras que influenciaram o resultado

### 6. Separacao explicita entre tipos de entrada

O sistema deve distinguir claramente quatro grupos de elementos:

#### Custos base

Custos inerentes ao produto, relativamente estaveis e independentes do contexto operacional imediato.

Exemplos:

- custo de aquisicao
- custo de producao
- custo unitario base

#### Custos contextuais

Custos que dependem do canal, operacao ou situacao comercial.

Exemplos:

- taxa de marketplace
- frete medio
- imposto por operacao
- indices extras
- comissoes adicionais

#### Objetivos

Elementos que orientam a estrategia de precificacao.

Exemplos:

- margem alvo
- lucro minimo
- posicionamento competitivo
- giro de estoque
- ganho de participacao

#### Restricoes

Limites que o sistema nao deve violar, independentemente da estrategia.

Exemplos:

- preco minimo
- margem minima
- teto de desconto
- regra contratual do canal
- politicas comerciais

Essa separacao e fundamental para evitar modelos confusos em que tudo vira apenas um numero jogado na formula.

### 7. O backend deve ser a fonte principal da decisao de precificacao

O backend deve ser a referencia oficial da regra aplicada e do resultado calculado.

O frontend pode:

- exibir explicacoes
- disparar simulacoes
- apresentar comparacoes

Mas nao deve carregar a responsabilidade principal por decidir regra de negocio.

### 8. O sistema deve ser orientado a contexto, nao apenas a campos soltos

A aplicacao futura do motor nao deve depender apenas de ler campos avulsos.

Ela deve considerar o contexto de precificacao como um objeto estruturado, contendo:

- dados do produto
- dados do canal
- custos
- objetivos
- restricoes
- sinais externos relevantes

Essa abordagem reduz a fragmentacao da logica e melhora a previsibilidade do motor.

## Principios de modelagem de regras

### 9. Regras devem ser entidades de negocio, nao apenas condicoes de codigo

Uma regra de precificacao deve ser tratada como elemento de dominio.

Isso significa que uma regra precisa ter identidade e atributos claros, como:

- nome
- tipo
- escopo
- prioridade
- criterio de aplicacao
- objetivo
- restricoes associadas
- status

Mesmo quando a implementacao comecar simples, a modelagem deve respeitar essa direcao.

### 10. Regras devem ser compostas e priorizaveis

O sistema deve permitir que mais de uma regra participe da decisao final.

Isso exige que o desenho considere:

- ordem de avaliacao
- prioridade
- criterios de desempate
- tratamento de conflito
- consolidacao da decisao final

O motor nao deve depender de uma unica regra monolitica.

### 11. Regras devem ser reutilizaveis e independentes de canal de entrada

Uma regra nao deve existir apenas porque uma tela ou rota especifica precisa dela.

Ela deve poder ser aplicada de forma consistente em:

- cadastro manual
- reprecificacao em massa
- simulacao
- processamento futuro em lote
- integracoes externas

## Principios de seguranca e auditoria

### 12. Toda decisao relevante deve deixar rastros compreensiveis

Sempre que um preco relevante for calculado, o sistema deve ser capaz de registrar:

- contexto recebido
- regras avaliadas
- regra ou combinacao vencedora
- parametros efetivamente usados
- resultado final

Isso e importante tanto para operacao quanto para suporte e governanca.

### 13. O resultado deve ser explicavel para publico tecnico e nao tecnico

O sistema deve produzir explicacoes que atendam dois niveis:

- nivel operacional: resumo claro para usuario de negocio
- nivel tecnico: detalhes suficientes para auditoria e depuracao

## Principios de escalabilidade

### 14. O sistema deve ser escalavel para milhares de produtos

O desenho futuro deve considerar desde o inicio que o sistema precisa operar com grande volume.

Isso inclui suportar:

- milhares de produtos
- multiplos marketplaces
- reprecificacao em massa
- execucao repetida sem degradacao excessiva

Escalabilidade aqui nao e apenas infraestrutura. E tambem desenho de dominio e fluxo de processamento.

### 15. A aplicacao de regras deve evitar dependencias acidentais e gargalos desnecessarios

O motor deve ser desenhado para:

- minimizar duplicidade de calculo
- evitar busca redundante de contexto
- reduzir acoplamento entre componentes
- permitir processamento previsivel por lote

### 16. O modelo deve permitir evolucao para processamento asincrono

Mesmo que a primeira fase continue simples, a arquitetura deve permitir futura evolucao para:

- reprecificacao em massa desacoplada
- filas
- jobs
- processamento em etapas

Sem exigir reescrita completa da camada de regras.

## Principios de testabilidade

### 17. Componentes com responsabilidades separadas sao mais testaveis

O desenho deve facilitar testes independentes de:

- calculadora
- regras individuais
- orquestracao
- montagem de contexto
- consolidacao do resultado

Quanto mais separadas as responsabilidades, menor a necessidade de testes acoplados e mais facil a deteccao de regressao.

### 18. O motor deve ser previsivel e deterministico dado o mesmo contexto

Com o mesmo contexto de entrada e o mesmo conjunto de regras ativo, o resultado deve ser o mesmo.

Esse principio e essencial para:

- auditoria
- reproducao de bugs
- confiabilidade operacional
- testes automatizados

## Principios para evolucao incremental

### 19. A evolucao deve preservar clareza arquitetural desde o inicio

Mesmo em etapas iniciais, o projeto deve caminhar na direcao de:

- responsabilidade bem definida
- centralizacao da logica de regras
- baixo acoplamento
- rastreabilidade das decisoes

### 20. O crescimento funcional nao deve comprometer a explicabilidade

Adicionar novas regras nunca deve transformar o sistema em uma caixa-preta.

Quanto mais sofisticado o motor ficar, mais importante sera manter:

- nomenclatura clara
- estrutura previsivel
- justificativa do resultado
- visibilidade sobre o caminho de decisao

## Conclusao

O futuro motor de precificacao deve ser construido sobre uma separacao conceitual firme:

- a calculadora faz apenas matematica
- o motor de regras decide estrategia e parametros
- o orquestrador decide quais regras se aplicam conforme o contexto

As regras nao devem ficar hardcoded em rotas, frontend ou `ifs` espalhados. O sistema deve ser auditavel, explicavel ao usuario e organizado em torno de uma separacao explicita entre custos base, custos contextuais, objetivos e restricoes.

Por fim, a arquitetura futura deve ser desenhada para operar com milhares de produtos e crescer sem perder clareza, previsibilidade e governanca.
