# 07. Regras para o Codex

## Objetivo do documento

Definir diretrizes de trabalho para qualquer agente automatico, incluindo Codex, que participe da evolucao deste projeto.

O objetivo principal destas regras e evitar mudancas estruturais desorganizadas, preservar a coerencia arquitetural definida na pasta `docs/` e garantir que a evolucao do motor de precificacao aconteca de forma segura, incremental e explicavel.

## 1. Principios gerais de atuacao

Qualquer agente automatico que atue neste projeto deve seguir os principios abaixo.

### Respeitar a arquitetura definida nos documentos em `docs/`

Os documentos da pasta `docs/` devem ser tratados como referencia principal para a evolucao estrutural do sistema.

Isso inclui, especialmente:

- visao do produto
- estado atual da precificacao
- principios do motor de regras
- catalogo de regras
- arquitetura alvo
- plano de implementacao

O agente nao deve agir como se a arquitetura do projeto precisasse ser redefinida a cada tarefa. A base conceitual ja documentada deve orientar as decisoes.

### Preservar a separacao entre calculadora, motor de regras e orquestrador

O agente deve respeitar a separacao arquitetural entre:

- calculadora de preco
- motor de regras
- orquestrador de contexto

Isso significa:

- a calculadora continua responsavel apenas pela matematica
- o motor de regras decide estrategia e parametros
- o orquestrador decide quais regras se aplicam conforme o contexto

Nenhuma mudanca deve reintroduzir logica de estrategia diretamente na formula ou espalhar decisao de regra em varios pontos da aplicacao.

### Priorizar mudancas incrementais e seguras

Sempre que houver mais de uma forma de evoluir o sistema, o agente deve preferir a opcao que:

- reduz risco de regressao
- preserva compatibilidade com o comportamento atual
- facilita validacao
- mantem clareza arquitetural

Mudancas pequenas, controladas e cumulativas devem ser priorizadas sobre reescritas amplas.

## 2. Restricoes importantes

Qualquer agente automatico deve obedecer as seguintes restricoes.

### O agente nao deve apagar documentacao existente sem autorizacao explicita

Documentos em `docs/` nao devem ser removidos, substituidos integralmente ou esvaziados sem pedido explicito.

Se houver conflito entre documentacao e codigo atual, o agente deve:

- registrar a divergencia
- propor ajuste
- evitar destruir historico documental sem alinhamento

### O agente nao deve mover arquivos em massa

Mudancas amplas de estrutura de pastas ou reorganizacao macica de arquivos devem ser evitadas sem aprovacao clara.

Isso inclui:

- mover muitos arquivos de uma vez
- reorganizar camadas inteiras sem necessidade imediata
- alterar a topologia do projeto sem documentacao previa

### O agente nao deve alterar multiplas camadas do sistema em uma unica alteracao

Sempre que possivel, o agente deve evitar alterar ao mesmo tempo:

- banco de dados
- backend
- frontend
- documentacao estrutural

em um unico movimento grande e acoplado.

Alteracoes em multiplas camadas so devem ocorrer quando forem realmente necessarias e quando houver justificativa clara e rastreavel.

### O agente nao deve misturar arquitetura futura com correcoes pontuais

Se a tarefa for uma correcao localizada, o agente nao deve aproveitar para introduzir mudancas arquiteturais amplas sem pedido explicito.

Da mesma forma, uma tarefa de evolucao arquitetural nao deve ser poluida com refatoracoes laterais irrelevantes.

### O agente nao deve alterar comportamento do calculo sem justificar

Qualquer alteracao que mude:

- formula
- parametros da calculadora
- logica de validacao
- resultado de precificacao

deve ser claramente justificada e relacionada ao plano arquitetural ou a uma necessidade funcional explicita.

Mudanca de comportamento de calculo nunca deve ser tratada como detalhe incidental.

## 3. Processo para mudancas estruturais

Mudancas estruturais devem seguir um fluxo disciplinado.

### Fluxo obrigatorio

1. analisar estado atual
2. comparar com arquitetura-alvo
3. propor alteracao
4. validar proposta
5. implementar em etapas pequenas

### Explicacao do fluxo

**1. Analisar estado atual**

Antes de propor qualquer alteracao estrutural, o agente deve entender:

- como o sistema funciona hoje
- em que camada esta o comportamento atual
- quais dependencias serao afetadas

**2. Comparar com arquitetura-alvo**

O agente deve verificar se a alteracao aproxima ou afasta o projeto da arquitetura documentada.

**3. Propor alteracao**

A proposta deve deixar claro:

- qual problema esta sendo resolvido
- qual componente sera afetado
- qual impacto estrutural e esperado

**4. Validar proposta**

Antes de uma mudanca grande, a proposta deve estar coerente com a documentacao oficial do projeto.

**5. Implementar em etapas pequenas**

A implementacao deve ser quebrada em passos menores sempre que isso reduzir risco e aumentar previsibilidade.

## 4. Limites de intervencao automatica

Agentes automaticos devem operar com limites claros de intervencao.

### Evitar refatoracoes completas sem aprovacao

O agente nao deve executar refatoracoes amplas ou reescritas significativas sem aprovacao explicita.

Isso inclui:

- reescrever servicos centrais
- substituir fluxos inteiros
- reorganizar arquitetura do backend ou frontend de uma vez

### Evitar mudancas amplas em banco de dados

Mudancas estruturais extensas de banco devem ser tratadas com cautela.

O agente deve evitar:

- remodelagem ampla sem documentacao
- alteracao massiva de persistencia sem plano
- adicao de estruturas conceituais sem alinhamento com a arquitetura

### Evitar alteracoes simultaneas em backend e frontend sem documentacao

Quando uma mudanca impactar backend e frontend ao mesmo tempo, ela deve estar:

- claramente justificada
- alinhada aos documentos de arquitetura
- explicada de forma objetiva

O agente nao deve introduzir mudancas cruzadas grandes sem contexto documental.

## 5. Boas praticas de evolucao do projeto

### Pequenas mudancas por vez

Cada alteracao deve ter escopo controlado e objetivo claro.

Mudancas pequenas facilitam:

- revisao
- teste
- reversao
- rastreabilidade

### Commits claros

Quando houver criacao de commits, eles devem ser organizados por intencao e nao por acumulacao desordenada de mudancas.

Cada commit deve refletir uma unidade de evolucao compreensivel.

### Preservacao de compatibilidade com o sistema atual

Sempre que possivel, a evolucao deve manter compatibilidade com o fluxo atual do sistema.

Isso e especialmente importante para:

- calculo existente
- estrutura de produtos
- integracao com marketplaces
- recalculo atual

### Documentacao antes de implementacao

Sempre que a mudanca tiver impacto estrutural, a documentacao deve preceder ou acompanhar a implementacao.

O projeto nao deve crescer por improviso arquitetural.

## 6. Uso da pasta `docs`

A pasta `docs` contem a fonte oficial de verdade para os direcionamentos estruturais do projeto.

Ela deve ser usada como referencia principal para:

- arquitetura
- regras de negocio
- plano de implementacao

### Implicacoes praticas

Qualquer alteracao estrutural deve ser coerente com os documentos existentes em `docs/`.

Se o agente identificar que uma mudanca necessaria nao cabe mais na arquitetura documentada, ele deve:

- registrar a divergencia
- propor ajuste documental
- evitar alterar a estrutura do sistema como se a documentacao nao existisse

### Papel da documentacao

Os documentos nao sao apenas apoio textual. Eles funcionam como mecanismo de alinhamento entre:

- produto
- negocio
- arquitetura
- implementacao

## Conclusao

Estas regras existem para garantir que a evolucao do projeto aconteca com seguranca, coerencia e disciplina arquitetural.

O objetivo e preservar a direcao do motor de precificacao definida nos documentos anteriores, evitando que agentes automaticos introduzam mudancas amplas, acopladas ou inconsistentes com a arquitetura alvo.

Em resumo:

- a documentacao em `docs/` orienta a evolucao estrutural
- a separacao entre calculo, regras e contexto deve ser preservada
- mudancas devem ser incrementais, justificadas e rastreaveis

Essas diretrizes existem para proteger a evolucao segura do projeto e sustentar a construcao do futuro motor de precificacao.
