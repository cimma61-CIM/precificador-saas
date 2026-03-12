# Regras de Preco

## Objetivo

Documentar o comportamento atual da precificacao no sistema, sem propor refatoracao neste passo.

## Conceitos usados hoje

- `custo`: valor base do produto;
- `preco_venda`: preco direto do produto;
- `margem` ou `margem_desejada`: margem alvo informada pelo usuario;
- `taxa_percentual`: comissao percentual do marketplace;
- `taxa_fixa`: custo fixo por venda;
- `frete_medio`: frete medio absorvido;
- `imposto_percentual`: percentual de imposto;
- `preco_calculado`: preco sugerido por marketplace.

## Normalizacao de entrada

Implementada em `server/services/precoService.js`.

- Percentuais aceitam valor decimal ou percentual inteiro.
- Exemplo: `20` vira `0.20`.
- Valores monetarios devem ser numericos e nao negativos.
- O nome do marketplace e normalizado para `slug`.

## Regra do preco direto

No cadastro/edicao de produto:

- se `preco_venda` for informado, ele prevalece;
- se `preco_venda` nao for informado e houver `margem_desejada`, o sistema calcula um preco direto pela formula:

`preco = custo / (1 - margem_desejada)`

- se nenhum dos dois for informado, o sistema grava `0`.

## Regra do preco por marketplace

Implementada em `calcularPrecoComTaxas`.

O calculo considera:

- custo;
- margem desejada;
- taxa percentual;
- taxa fixa;
- frete medio;
- imposto percentual;
- lucro minimo opcional.

O sistema calcula dois candidatos:

- preco por margem;
- preco por lucro minimo.

O maior valor entre eles vira o `preco_sugerido`.

## Formulas atuais

### Preco por margem

`(custo + frete_medio + taxa_fixa) / (1 - taxa_percentual - imposto_percentual - margem_desejada)`

### Preco por lucro minimo

`(custo + frete_medio + taxa_fixa + lucro_minimo) / (1 - taxa_percentual - imposto_percentual)`

### Resultado retornado

- `preco_sugerido`
- `lucro`
- `margem_real`

## Validacoes importantes

- percentual, imposto e margem nao podem somar 100% ou mais no calculo por margem;
- taxa percentual e imposto nao podem somar 100% ou mais no calculo por lucro;
- valores negativos sao rejeitados.

## Reprecificacao em lote

Implementada em `server/services/precificacaoService.js`.

Comportamento atual:

- percorre `produtos_marketplaces` do usuario;
- busca taxas em `taxas_marketplace`;
- atualiza `preco_calculado` quando existe taxa valida;
- zera `preco_calculado` quando falta taxa ou a margem e invalida;
- retorna resumo com itens atualizados e ignorados.

## Status usados na listagem de produtos

Cada marketplace associado a um produto pode aparecer com:

- `calculado`
- `sem_taxa`
- `margem_invalida`

## Inconsistencias documentadas

- A documentacao antiga fala genericamente em "preco de venda", mas o sistema atual separa `preco_venda` direto de `preco_calculado` por marketplace.
- A visao estrategica legada menciona repricing por concorrencia, mas essa regra ainda nao aparece implementada no backend atual.
