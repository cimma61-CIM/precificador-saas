let dashboardFeatureFlags = window.featureFlags || {}
let calcularPrecoIdealBase = window.precoIdealUtils?.calcularPrecoIdealBase || null

void import('./featureFlags.js')
  .then(({ featureFlags }) => {
    dashboardFeatureFlags = window.featureFlags || featureFlags
    window.featureFlags = dashboardFeatureFlags

    if (financeMetricasMap.size) {
      renderTabela([...financeMetricasMap.values()])
    }
  })
  .catch(() => {})

void import('./preco-ideal.js')
  .then((modulo) => {
    calcularPrecoIdealBase = modulo.calcularPrecoIdealBase
    window.precoIdealUtils = window.precoIdealUtils || modulo

    if (financeMetricasMap.size) {
      renderTabela([...financeMetricasMap.values()])
    }
  })
  .catch(() => {})

const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

if (!localStorage.getItem('token')) {
  window.location.href = '/login.html'
}

const financeSubtitle = document.getElementById('finance-subtitle')
const financeFeedback = document.getElementById('finance-feedback')
const financeTopBody = document.getElementById('finance-top-body')
const financeAlert = document.getElementById('alerta-dashboard')
const financeAlertList = document.getElementById('finance-alert-list')
const metricItensPrejuizoCard = document.getElementById('metric-itens-prejuizo-card')
let financeMetricasMap = new Map()

function inicializarGraficoDashboard() {
  const ctx = document.getElementById('graficoDashboard')

  if (!ctx) {
    return
  }

  if (typeof window.Chart !== 'function') {
    return
  }

  if (window.graficoDashboardInstance) {
    window.graficoDashboardInstance.destroy()
  }

  window.graficoDashboardInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
      datasets: [{
        label: 'Lucro',
        data: [120, 190, 150, 220, 300, 250, 320],
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false
    }
  })
}

function isAlertaPrecoAtiva() {
  return Boolean(dashboardFeatureFlags?.alertaPreco)
}

function isProdutoComPrejuizo(item) {
  return Number(item?.lucro || 0) <= 0
}

function setMetricCardStatus(element, status) {
  if (!element) {
    return
  }

  element.classList.remove('finance-side-item-neutro', 'finance-side-item-alerta', 'finance-side-item-erro', 'finance-side-item-ok')
  element.classList.add(`finance-side-item-${status}`)
}

function getClassesLinhaProduto(item) {
  const classes = []

  if (item.abaixoMinimo || item.status === 'erro') {
    classes.push('marketplace-loss-row')
  }

  if (isAlertaPrecoAtiva() && isProdutoComPrejuizo(item)) {
    classes.push('prejuizo')
  }

  return classes.join(' ')
}

function getIndicacaoPrejuizo(item) {
  if (!isAlertaPrecoAtiva() || !isProdutoComPrejuizo(item)) {
    return ''
  }

  return '<div class="prejuizo-label">Prejuizo</div>'
}

function calcularPrecoIdealSugestao(item) {
  if (!isAlertaPrecoAtiva() || !isProdutoComPrejuizo(item) || typeof calcularPrecoIdealBase !== 'function') {
    return null
  }

  return calcularPrecoIdealBase({
    custo: Number(item?.custo || 0),
    taxaFixa: Number(item?.taxa_fixa || 0),
    freteMedio: Number(item?.frete_medio || 0),
    taxaPercentual: normalizarPercent(item?.taxa_percentual),
    impostoPercentual: normalizarPercent(item?.imposto_percentual),
    indiceExtraPercentual: normalizarPercent(item?.indice_extra_percentual)
  })
}

function getSugestaoPrecoIdeal(item) {
  const precoIdeal = calcularPrecoIdealSugestao(item)

  if (!precoIdeal) {
    return ''
  }

  return `<div class="preco-ideal-label">Preco ideal: ${formatCurrency(precoIdeal)}</div>`
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0))
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`
}

function normalizarPercent(value) {
  const normalizar = window.dashboardMetricas?.normalizarPercent
  return typeof normalizar === 'function' ? normalizar(value) : Number(value || 0)
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

function calcularMetricas(produtos) {
  const calcularMetricasProduto = window.dashboardMetricas?.calcularMetricasProduto
  return typeof calcularMetricasProduto === 'function'
    ? produtos.map((produto) => calcularMetricasProduto(produto))
    : []
}

function obterStatusProduto(item) {
  const classificarStatus = window.dashboardMetricas?.classificarStatus
  const statusBase = typeof classificarStatus === 'function'
    ? classificarStatus(item.lucro, item.margem)
    : 'ok'

  if (item.abaixoMinimo || statusBase === 'erro') {
    return {
      label: '\u{1F534} Critico',
      className: 'status-error'
    }
  }

  if (statusBase === 'alerta') {
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

  if (Number(item.lucro) <= 0) {
    return 'Aumentar preco urgente'
  }

  if (item.abaixoMinimo) {
    return 'Rever preco minimo e canal'
  }

  if (Number(item.margem) > 0 && Number(item.margem) < 0.2) {
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
    <tr class="${getClassesLinhaProduto(item)}">
      <td>${item.nome}</td>
      <td>${formatCurrency(item.receita)}${getSugestaoPrecoIdeal(item)}</td>
      <td>${formatCurrency(item.custo)}</td>
      <td>${formatCurrency(item.lucro)}</td>
      <td>${formatPercent(item.margem)}</td>
      <td>${formatPercent(item.roi)}</td>
      <td>${formatCurrency(item.precoMinimo)}</td>
      <td><span class="status-badge ${obterStatusProduto(item).className}">${obterStatusProduto(item).label}</span></td>
      <td>${obterSugestaoProduto(item)}${getIndicacaoPrejuizo(item)}</td>
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
  const resumirMetricas = window.dashboardMetricas?.resumirMetricas
  const classificarQuantidade = window.dashboardMetricas?.classificarQuantidade
  const resumo = typeof resumirMetricas === 'function' ? resumirMetricas(metricas) : null
  const produtosPrejuizo = resumo ? resumo.produtosPrejuizo : []
  const produtosAbaixoMinimo = resumo ? resumo.produtosAbaixoMinimo : []
  const produtosMargemBaixa = resumo ? resumo.produtosMargemBaixa : []
  const oportunidades = metricas.filter((item) => item.receita > 0 && item.precoMinimo > 0 && item.receita >= item.precoMinimo * 1.4)
  const marketplaceCritico = produtosPrejuizo.reduce((acc, item) => {
    const chave = item.marketplaceNome || 'Sem canal'
    const atual = acc.get(chave) || { quantidade: 0, perda: 0 }
    atual.quantidade += 1
    atual.perda += Math.abs(Number(item.lucro || 0))
    acc.set(chave, atual)
    return acc
  }, new Map())

  const totais = resumo ? resumo.totais : {
    receita: 0,
    custo: 0,
    tarifa: 0,
    imposto: 0,
    ads: 0,
    lucro: 0,
    lucrativos: 0,
    prejuizo: 0,
    maiorLucro: 0,
    melhorRoi: 0
  }
  const despesasVariaveis = totais ? totais.tarifa + totais.imposto + totais.ads : 0
  const margemMedia = resumo ? resumo.margemMedia : 0
  const roiMedio = resumo ? resumo.roiMedio : 0
  const piorMargem = resumo ? resumo.piorMargem : 0
  const produtosRiscoIds = resumo ? resumo.produtosRiscoIds : new Set()
  const canalCritico = [...marketplaceCritico.entries()]
    .sort((a, b) => b[1].quantidade - a[1].quantidade || b[1].perda - a[1].perda)[0]
  const alertas = []

  if (metricas.length === 0) {
    setAlert('Nenhum produto analisado no momento.', 'neutral')
  } else if (margemMedia <= 0) {
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
  setMetricCardStatus(
    metricItensPrejuizoCard,
    typeof classificarQuantidade === 'function'
      ? classificarQuantidade(produtosPrejuizo.length, 'erro')
      : (produtosPrejuizo.length === 0 ? 'neutro' : 'erro')
  )
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

document.addEventListener('DOMContentLoaded', () => {
  inicializarGraficoDashboard()
  carregarDashboardFinanceiro()
})
