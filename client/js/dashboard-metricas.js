;(function initDashboardMetricas() {
  function toNumber(value) {
    return Number(value || 0)
  }

  function normalizarPercent(value) {
    const numero = toNumber(value)
    return numero > 1 ? numero / 100 : numero
  }

  function classificarStatus(lucro, margem) {
    const lucroNormalizado = toNumber(lucro)
    const margemNormalizada = toNumber(margem)

    if (lucroNormalizado <= 0) {
      return 'erro'
    }

    if (margemNormalizada > 0 && margemNormalizada < 0.2) {
      return 'alerta'
    }

    return 'ok'
  }

  function classificarQuantidade(quantidade, classeComValor = 'erro') {
    return toNumber(quantidade) === 0 ? 'neutro' : classeComValor
  }

  function calcularPrecoMinimo(item) {
    const custo = toNumber(item?.custo)
    const taxaFixa = toNumber(item?.taxa_fixa)
    const frete = toNumber(item?.frete_medio)
    const taxaPercentual = normalizarPercent(item?.taxa_percentual)
    const imposto = normalizarPercent(item?.imposto_percentual)
    const indicesExtras = normalizarPercent(item?.indice_extra_percentual)
    const divisor = 1 - (taxaPercentual + imposto + indicesExtras)

    if (divisor <= 0) {
      return 0
    }

    return (custo + taxaFixa + frete) / divisor
  }

  function calcularMetricasProduto(produto) {
    const marketplacePrimario = Array.isArray(produto?.marketplaces) && produto.marketplaces.length
      ? produto.marketplaces[0]
      : {}
    const receita = toNumber(produto?.preco_venda || marketplacePrimario?.preco_calculado || produto?.preco)
    const custo = toNumber(produto?.custo)
    const tarifa =
      toNumber(produto?.tarifa || marketplacePrimario?.taxa_fixa) +
      (receita * normalizarPercent(marketplacePrimario?.taxa_percentual))
    const imposto =
      toNumber(produto?.imposto) || (receita * normalizarPercent(marketplacePrimario?.imposto_percentual))
    const ads =
      toNumber(produto?.ads) || (receita * normalizarPercent(marketplacePrimario?.indice_extra_percentual))
    const lucro = receita - custo - tarifa - imposto - ads
    const margem = receita > 0 ? lucro / receita : 0
    const roi = custo > 0 ? lucro / custo : 0
    const precoMinimo = calcularPrecoMinimo({
      custo,
      taxa_fixa: marketplacePrimario?.taxa_fixa,
      frete_medio: marketplacePrimario?.frete_medio,
      taxa_percentual: marketplacePrimario?.taxa_percentual,
      imposto_percentual: marketplacePrimario?.imposto_percentual,
      indice_extra_percentual: marketplacePrimario?.indice_extra_percentual
    })
    const abaixoMinimo = precoMinimo > 0 && receita < precoMinimo
    const status = classificarStatus(lucro, margem)

    return {
      id: produto?.id,
      nome: produto?.nome,
      receita,
      custo,
      tarifa,
      imposto,
      ads,
      lucro,
      margem,
      roi,
      precoMinimo,
      abaixoMinimo,
      status,
      marketplaceNome: marketplacePrimario?.nome || produto?.marketplace || 'Sem canal',
      taxa_percentual: marketplacePrimario?.taxa_percentual || 0,
      taxa_fixa: marketplacePrimario?.taxa_fixa || 0,
      frete_medio: marketplacePrimario?.frete_medio || 0,
      imposto_percentual: marketplacePrimario?.imposto_percentual || 0,
      indice_extra_percentual: marketplacePrimario?.indice_extra_percentual || 0
    }
  }

  function resumirMetricas(metricas) {
    const produtosPrejuizo = metricas.filter((item) => toNumber(item.lucro) <= 0)
    const produtosAbaixoMinimo = metricas.filter((item) => item.abaixoMinimo)
    const produtosMargemBaixa = metricas.filter(
      (item) => toNumber(item.lucro) > 0 && toNumber(item.margem) > 0 && toNumber(item.margem) < 0.2
    )
    const produtosRiscoIds = new Set([
      ...produtosPrejuizo.map((item) => item.id),
      ...produtosAbaixoMinimo.map((item) => item.id),
      ...produtosMargemBaixa.map((item) => item.id)
    ])
    const totais = metricas.reduce((acc, item) => {
      acc.receita += toNumber(item.receita)
      acc.custo += toNumber(item.custo)
      acc.tarifa += toNumber(item.tarifa)
      acc.imposto += toNumber(item.imposto)
      acc.ads += toNumber(item.ads)
      acc.lucro += toNumber(item.lucro)
      acc.lucrativos += toNumber(item.lucro) > 0 ? 1 : 0
      acc.prejuizo += toNumber(item.lucro) <= 0 ? 1 : 0
      acc.maiorLucro = Math.max(acc.maiorLucro, toNumber(item.lucro))
      acc.melhorRoi = Math.max(acc.melhorRoi, toNumber(item.roi))
      acc.piorMargem = Math.min(acc.piorMargem, toNumber(item.margem))
      return acc
    }, {
      receita: 0,
      custo: 0,
      tarifa: 0,
      imposto: 0,
      ads: 0,
      lucro: 0,
      lucrativos: 0,
      prejuizo: 0,
      maiorLucro: 0,
      melhorRoi: 0,
      piorMargem: metricas.length ? Number.POSITIVE_INFINITY : 0
    })

    return {
      produtosPrejuizo,
      produtosAbaixoMinimo,
      produtosMargemBaixa,
      produtosRiscoIds,
      totais,
      margemMedia: totais.receita > 0 ? totais.lucro / totais.receita : 0,
      roiMedio: totais.custo > 0 ? totais.lucro / totais.custo : 0,
      piorMargem: Number.isFinite(totais.piorMargem) ? totais.piorMargem : 0
    }
  }

  window.dashboardMetricas = {
    normalizarPercent,
    classificarStatus,
    classificarQuantidade,
    calcularPrecoMinimo,
    calcularMetricasProduto,
    resumirMetricas
  }
})()
