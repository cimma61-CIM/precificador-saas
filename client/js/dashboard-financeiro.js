const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

if (!localStorage.getItem('token')) {
  window.location.href = '/login.html'
}

const financeSubtitle = document.getElementById('finance-subtitle')
const financeFeedback = document.getElementById('finance-feedback')
const financeTopBody = document.getElementById('finance-top-body')
const financeAlert = document.getElementById('alerta-dashboard')
const financeAlertList = document.getElementById('finance-alert-list')
let financeMetricasMap = new Map()

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0))
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`
}

function setText(id, value) {
  const element = document.getElementById(id)

  if (element) {
    element.textContent = value
  }
}

function setFeedback(message, isError = false) {
  if (!financeFeedback) {
    return
  }

  financeFeedback.textContent = message
  financeFeedback.className = `feedback ${isError ? 'text-danger' : ''}`.trim()
}

function setAlert(message, variant = 'healthy') {
  if (!financeAlert) {
    return
  }

  financeAlert.textContent = message
  financeAlert.className = `finance-alert finance-alert-${variant}`.trim()
}

function renderAlertList(alertas) {
  if (!financeAlertList) {
    return
  }

  if (!alertas.length) {
    financeAlertList.innerHTML = `
      <article class="finance-alert-item finance-alert-item-success">
        <strong>Nenhum alerta critico no momento.</strong>
        <span>Continue monitorando margem e taxa dos canais para manter a operacao saudavel.</span>
      </article>
    `
    return
  }

  financeAlertList.innerHTML = alertas.map((alerta) => `
    <article class="finance-alert-item finance-alert-item-${alerta.variant}">
      <strong>${alerta.title}</strong>
      <span>${alerta.detail}</span>
    </article>
  `).join('')
}

function normalizarPercent(value) {
  const numero = Number(value || 0)
  return numero > 1 ? numero / 100 : numero
}

function calcularPrecoMinimoDashboard(item) {
  const custo = Number(item.custo || 0)
  const taxaFixa = Number(item.taxa_fixa || 0)
  const frete = Number(item.frete_medio || 0)
  const taxaPercentual = normalizarPercent(item.taxa_percentual)
  const imposto = normalizarPercent(item.imposto_percentual)
  const indicesExtras = normalizarPercent(item.indice_extra_percentual)
  const divisor = 1 - (taxaPercentual + imposto + indicesExtras)

  if (divisor <= 0) {
    return 0
  }

  return (custo + taxaFixa + frete) / divisor
}

function calcularMetricas(produtos) {
  return produtos.map((produto) => {
    const marketplacePrimario = Array.isArray(produto.marketplaces) && produto.marketplaces.length
      ? produto.marketplaces[0]
      : {}
    const receita = Number(produto.preco_venda || marketplacePrimario.preco_calculado || produto.preco || 0)
    const custo = Number(produto.custo || 0)
    const tarifa = Number(produto.tarifa || marketplacePrimario.taxa_fixa || 0) + (receita * normalizarPercent(marketplacePrimario.taxa_percentual))
    const imposto = Number(produto.imposto || 0) || (receita * normalizarPercent(marketplacePrimario.imposto_percentual))
    const ads = Number(produto.ads || 0) || (receita * normalizarPercent(marketplacePrimario.indice_extra_percentual))
    const lucro = receita - custo - tarifa - imposto - ads
    const margem = receita > 0 ? lucro / receita : 0
    const roi = custo > 0 ? lucro / custo : 0
    const precoMinimo = calcularPrecoMinimoDashboard({
      custo,
      taxa_fixa: marketplacePrimario.taxa_fixa,
      frete_medio: marketplacePrimario.frete_medio,
      taxa_percentual: marketplacePrimario.taxa_percentual,
      imposto_percentual: marketplacePrimario.imposto_percentual,
      indice_extra_percentual: marketplacePrimario.indice_extra_percentual
    })

    return {
      id: produto.id,
      nome: produto.nome,
      receita,
      custo,
      tarifa,
      imposto,
      ads,
      lucro,
      margem,
      roi,
      precoMinimo,
      marketplaceNome: marketplacePrimario.nome || produto.marketplace || 'Sem canal',
      taxa_percentual: marketplacePrimario.taxa_percentual || 0,
      taxa_fixa: marketplacePrimario.taxa_fixa || 0,
      frete_medio: marketplacePrimario.frete_medio || 0,
      imposto_percentual: marketplacePrimario.imposto_percentual || 0,
      indice_extra_percentual: marketplacePrimario.indice_extra_percentual || 0
    }
  })
}

function obterStatusProduto(item) {
  if (Number(item.receita) < Number(item.precoMinimo || 0) || Number(item.lucro) < 0) {
    return {
      label: '\u{1F534} Critico',
      className: 'status-error'
    }
  }

  if (Number(item.margem) < 0.1) {
    return {
      label: '\u{1F7E1} Atencao',
      className: 'status-warn'
    }
  }

  return {
    label: '\u{1F7E2} Saudavel',
    className: 'status-ok'
  }
}

function obterSugestaoProduto(item) {
  const receita = Number(item.receita || 0)
  const tarifa = Number(item.tarifa || 0)
  const relacaoTarifa = receita > 0 ? tarifa / receita : 0

  if (Number(item.lucro) < 0) {
    return 'Aumentar preco urgente'
  }

  if (receita < Number(item.precoMinimo || 0)) {
    return 'Rever preco minimo e canal'
  }

  if (Number(item.margem) < 0.1) {
    return 'Aumentar preco ou reduzir custo'
  }

  if (relacaoTarifa > 0.4) {
    return 'Rever marketplace (taxa alta)'
  }

  return 'OK'
}

function calcularPrecoIdeal(custo, tarifa, margemDesejada) {
  const custoNormalizado = Number(custo || 0)
  const tarifaNormalizada = Number(tarifa || 0)
  const margemNormalizada = Number(margemDesejada || 0)
  const divisor = 1 - 0.15 - margemNormalizada

  if (divisor <= 0) {
    return 0
  }

  return (custoNormalizado + tarifaNormalizada) / divisor
}

function simularPrecoProduto(item) {
  const valorInformado = window.prompt(`Novo preco para ${item.nome}:`, String(Number(item.receita || 0).toFixed(2)))

  if (valorInformado === null) {
    return
  }

  const preco = Number(String(valorInformado).replace(',', '.'))

  if (!Number.isFinite(preco) || preco <= 0) {
    window.alert('Preco invalido para simulacao.')
    return
  }

  const custo = Number(item.custo || 0)
  const tarifa = Number(item.tarifa || 0)
  const imposto = preco * 0.1
  const ads = preco * 0.05
  const lucro = preco - custo - tarifa - imposto - ads
  const margem = preco > 0 ? lucro / preco : 0

  window.alert(`Lucro: ${formatCurrency(lucro)}\nMargem: ${formatPercent(margem)}`)
}

function exibirPrecoIdeal(item) {
  const preco20 = calcularPrecoIdeal(item.custo, item.tarifa, 0.2)
  const preco30 = calcularPrecoIdeal(item.custo, item.tarifa, 0.3)

  window.alert(
    `Preco ideal para ${item.nome}\n` +
    `Margem 20%: ${formatCurrency(preco20)}\n` +
    `Margem 30%: ${formatCurrency(preco30)}`
  )
}

async function carregarPaginaProdutos(page, limit) {
  const resposta = await apiFetch(`/produtos?limit=${limit}&page=${page}`)
  return resposta
}

async function carregarTodosProdutos() {
  const limit = 200
  const primeiraPagina = await carregarPaginaProdutos(1, limit)
  const produtos = [...(primeiraPagina.produtos || [])]
  const totalPages = Number(primeiraPagina.totalPages || 1)
  const concorrencia = 4

  for (let inicio = 2; inicio <= totalPages; inicio += concorrencia) {
    const paginas = []

    for (let pagina = inicio; pagina < inicio + concorrencia && pagina <= totalPages; pagina += 1) {
      paginas.push(carregarPaginaProdutos(pagina, limit))
    }

    const respostas = await Promise.all(paginas)

    for (const resposta of respostas) {
      produtos.push(...(resposta.produtos || []))
    }
  }

  return produtos
}

function renderTabela(metricas) {
  financeMetricasMap = new Map(metricas.map((item) => [Number(item.id), item]))

  if (!metricas.length) {
    financeTopBody.innerHTML = `
      <tr>
        <td colspan="10" class="table-empty-cell">Nenhum produto encontrado para analise.</td>
      </tr>
    `
    return
  }

  const topProdutos = [...metricas]
    .sort((a, b) => a.margem - b.margem)
    .slice(0, 10)

  financeTopBody.innerHTML = topProdutos.map((item) => `
    <tr class="${item.receita < item.precoMinimo || item.lucro < 0 ? 'marketplace-loss-row' : ''}">
      <td>${item.nome}</td>
      <td>${formatCurrency(item.receita)}</td>
      <td>${formatCurrency(item.custo)}</td>
      <td>${formatCurrency(item.lucro)}</td>
      <td>${formatPercent(item.margem)}</td>
      <td>${formatPercent(item.roi)}</td>
      <td>${formatCurrency(item.precoMinimo)}</td>
      <td><span class="status-badge ${obterStatusProduto(item).className}">${obterStatusProduto(item).label}</span></td>
      <td>${obterSugestaoProduto(item)}</td>
      <td>
        <div class="finance-table-actions">
          <button type="button" class="button-secondary finance-action-button" data-action="simular" data-id="${item.id}">Simular</button>
          <button type="button" class="finance-action-button" data-action="preco-ideal" data-id="${item.id}">Preco ideal</button>
        </div>
      </td>
    </tr>
  `).join('')
}

function atualizarResumo(metricas) {
  const produtosPrejuizo = metricas.filter((item) => item.lucro < 0)
  const produtosAbaixoMinimo = metricas.filter((item) => item.receita < item.precoMinimo && item.precoMinimo > 0)
  const produtosMargemBaixa = metricas.filter((item) => item.margem >= 0 && item.margem < 0.1)
  const oportunidades = metricas.filter((item) => item.receita > 0 && item.precoMinimo > 0 && item.receita >= item.precoMinimo * 1.4)
  const marketplaceCritico = produtosPrejuizo.reduce((acc, item) => {
    const chave = item.marketplaceNome || 'Sem canal'
    const atual = acc.get(chave) || { quantidade: 0, perda: 0 }
    atual.quantidade += 1
    atual.perda += Math.abs(Number(item.lucro || 0))
    acc.set(chave, atual)
    return acc
  }, new Map())

  const totais = metricas.reduce((acc, item) => {
    acc.receita += item.receita
    acc.custo += item.custo
    acc.tarifa += item.tarifa
    acc.imposto += item.imposto
    acc.ads += item.ads
    acc.lucro += item.lucro
    acc.lucrativos += item.lucro > 0 ? 1 : 0
    acc.prejuizo += item.lucro < 0 ? 1 : 0
    acc.maiorLucro = Math.max(acc.maiorLucro, item.lucro)
    acc.melhorRoi = Math.max(acc.melhorRoi, item.roi)
    acc.piorMargem = Math.min(acc.piorMargem, item.margem)
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

  const despesasVariaveis = totais.tarifa + totais.imposto + totais.ads
  const margemMedia = totais.receita > 0 ? totais.lucro / totais.receita : 0
  const roiMedio = totais.custo > 0 ? totais.lucro / totais.custo : 0
  const piorMargem = Number.isFinite(totais.piorMargem) ? totais.piorMargem : 0
  const produtosRiscoIds = new Set([
    ...produtosPrejuizo.map((item) => item.id),
    ...produtosAbaixoMinimo.map((item) => item.id),
    ...produtosMargemBaixa.map((item) => item.id)
  ])
  const canalCritico = [...marketplaceCritico.entries()]
    .sort((a, b) => b[1].quantidade - a[1].quantidade || b[1].perda - a[1].perda)[0]
  const alertas = []

  if (margemMedia < 0) {
    setAlert('\u{1F534} Prejuizo geral', 'danger')
  } else if (margemMedia < 0.2) {
    setAlert('\u{1F7E1} Margem geral baixa', 'warning')
  } else {
    setAlert('\u{1F7E2} Operacao saudavel', 'healthy')
  }

  if (produtosPrejuizo.length > 0) {
    alertas.push({
      variant: 'danger',
      title: `\u{1F534} ${produtosPrejuizo.length} produtos com prejuizo`,
      detail: 'Acao sugerida: revisar preco e custo imediatamente.'
    })
  }

  if (produtosAbaixoMinimo.length > 0) {
    alertas.push({
      variant: 'danger',
      title: `\u{1F534} ${produtosAbaixoMinimo.length} vendendo abaixo do minimo`,
      detail: 'Acao sugerida: corrigir preco minimo por canal antes de perder margem.'
    })
  }

  if (produtosMargemBaixa.length > 0) {
    alertas.push({
      variant: 'warning',
      title: `\u{1F7E1} Margem baixa em ${produtosMargemBaixa.length} produtos`,
      detail: 'Acao sugerida: priorizar ajuste de taxa, frete ou markup.'
    })
  }

  if (oportunidades.length > 0) {
    alertas.push({
      variant: 'success',
      title: `\u{1F7E2} ${oportunidades.length} oportunidades de aumento de preco`,
      detail: 'Acao sugerida: testar reajuste gradual para capturar margem.'
    })
  }

  if (canalCritico && canalCritico[1].quantidade > 0) {
    alertas.push({
      variant: 'danger',
      title: `\u{1F534} Problema no canal ${canalCritico[0]}`,
      detail: `Acao sugerida: revisar taxa e preco em ${canalCritico[1].quantidade} itens desse canal.`
    })
  }

  renderAlertList(alertas)

  setText('metric-receita-total', formatCurrency(totais.receita))
  setText('metric-lucro-total', formatCurrency(totais.lucro))
  setText('metric-margem-media', formatPercent(margemMedia))
  setText('metric-roi-medio', formatPercent(roiMedio))
  setText('metric-produtos-analisados', String(metricas.length))
  setText('metric-custo-total', formatCurrency(totais.custo))
  setText('metric-despesas-variaveis', formatCurrency(despesasVariaveis))
  setText('metric-itens-lucrativos', String(totais.lucrativos))
  setText('metric-itens-prejuizo', String(totais.prejuizo))
  setText('metric-maior-lucro', formatCurrency(totais.maiorLucro))
  setText('metric-pior-margem', formatPercent(piorMargem))
  setText('metric-melhor-roi', formatPercent(totais.melhorRoi))
  setText('metric-produtos-risco', String(produtosRiscoIds.size))
}

async function carregarDashboardFinanceiro() {
  try {
    setFeedback('Carregando metricas financeiras...')

    if (usuario.nome) {
      financeSubtitle.textContent = `Visao consolidada de ${usuario.nome} com base nos produtos ja cadastrados na operacao.`
    }

    const produtos = await carregarTodosProdutos()
    const metricas = calcularMetricas(produtos)

    atualizarResumo(metricas)
    renderTabela(metricas)
    setFeedback(`Metricas atualizadas com ${metricas.length} produtos.`)
  } catch (error) {
    setFeedback(error.message, true)
  }
}

financeTopBody?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]')

  if (!button) {
    return
  }

  const action = button.dataset.action
  const id = Number(button.dataset.id)

  if (!Number.isInteger(id) || id <= 0) {
    return
  }

  if (!financeMetricasMap.has(id)) {
    return
  }

  const item = financeMetricasMap.get(id)

  if (action === 'simular') {
    simularPrecoProduto(item)
    return
  }

  if (action === 'preco-ideal') {
    exibirPrecoIdeal(item)
  }
})

document.getElementById('finance-refresh-button')?.addEventListener('click', async () => {
  await carregarDashboardFinanceiro()
})

carregarDashboardFinanceiro()
