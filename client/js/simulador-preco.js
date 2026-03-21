let simuladorFeatureFlags = window.featureFlags || {}
let calcularPrecoIdealBase = window.precoIdealUtils?.calcularPrecoIdealBase || null

void import('./featureFlags.js')
  .then(({ featureFlags }) => {
    simuladorFeatureFlags = window.featureFlags || featureFlags
    window.featureFlags = simuladorFeatureFlags
    atualizarResumoSelecionado(getProdutoSelecionado())
  })
  .catch(() => {})

void import('./preco-ideal.js')
  .then((modulo) => {
    calcularPrecoIdealBase = modulo.calcularPrecoIdealBase
    window.precoIdealUtils = window.precoIdealUtils || modulo
    atualizarResumoSelecionado(getProdutoSelecionado())
  })
  .catch(() => {})

let simuladorPaginaAtual = 1
let simuladorBuscaAtual = ''
let simuladorBuscaTimer = null
let simuladorProdutosCache = []
let simuladorProdutoSelecionadoId = null
let simuladorModoAtual = 'ideal'
const simuladorCamposIds = [
  'sim-custo',
  'marketplace',
  'sim-margem',
  'sim-taxa-percentual',
  'sim-taxa-fixa',
  'sim-frete-medio',
  'sim-indice-extra',
  'sim-imposto',
  'precoConcorrente',
  'precoConcorrenteComparativo',
  'simulador-calcular-button',
  'simulador-analisar-button'
]

function isModoReverso() {
  return simuladorModoAtual === 'reverso'
}

function getInputPrecoConcorrentePrincipal() {
  return document.getElementById('precoConcorrente')
}

function getInputPrecoConcorrenteComparativo() {
  return document.getElementById('precoConcorrenteComparativo')
}

function sincronizarPrecoConcorrente(valor, origemId = '') {
  ;[getInputPrecoConcorrentePrincipal(), getInputPrecoConcorrenteComparativo()].forEach((input) => {
    if (input && input.id !== origemId) {
      input.value = valor
    }
  })
}

function getMarketplaceSelect() {
  return document.getElementById('marketplace')
}

async function carregarMarketplaces() {
  const select = getMarketplaceSelect()

  if (!select) {
    return
  }

  try {
    const dados = await apiFetch('/marketplaces')

    select.innerHTML = '<option value="">Selecione</option>'

    if (!Array.isArray(dados)) {
      return
    }

    dados.forEach((marketplace) => {
      const option = document.createElement('option')
      option.value = marketplace.id
      option.textContent = marketplace.nome
      select.appendChild(option)
    })
  } catch (error) {
    console.error('Erro ao carregar marketplaces:', error)
  }
}

function setSimuladorFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('simulador-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function hasProdutoSelecionado() {
  return Number.isFinite(Number(simuladorProdutoSelecionadoId)) && Number(simuladorProdutoSelecionadoId) > 0
}

function bloquearCamposSimulador() {
  simuladorCamposIds.forEach((id) => {
    const element = document.getElementById(id)

    if (element) {
      element.disabled = true
    }
  })
}

function habilitarCamposSimulador() {
  simuladorCamposIds.forEach((id) => {
    const element = document.getElementById(id)

    if (element) {
      element.disabled = false
    }
  })
}

function validarProdutoSelecionado(mensagem = 'Selecione um produto para comecar') {
  if (hasProdutoSelecionado()) {
    return true
  }

  setSimuladorFeedback(mensagem, 'text-danger')
  return false
}

function setResultadoFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('simulador-resultado-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function setAnaliseFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('simulador-analise-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function setResultadoSugestao(mensagem) {
  const sugestao = document.getElementById('simulador-resultado-sugestao')
  sugestao.textContent = mensagem
}

function animateLiberado(element) {
  if (!element) {
    return
  }

  element.classList.remove('liberado')
  void element.offsetWidth
  element.classList.add('liberado')
}

function atualizarStep(step) {
  document.querySelectorAll('#simulador-steps [data-step]').forEach((item) => {
    const itemStep = Number(item.dataset.step)
    item.classList.toggle('is-active', itemStep === step)
    item.classList.toggle('is-complete', itemStep < step)
  })
}

function atualizarEtapasSimulador(etapa) {
  const etapaSimulacao = document.getElementById('simulador-etapa-simulacao')
  const etapaConcorrencia = document.getElementById('simulador-etapa-concorrencia')
  const etapaResultado = document.getElementById('simulador-etapa-resultado')

  etapaSimulacao.classList.remove('hidden')
  etapaConcorrencia.classList.toggle('hidden', isModoReverso() || (etapa !== 'concorrencia' && etapa !== 'resultado'))
  etapaResultado.classList.toggle('hidden', etapa !== 'resultado')
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0))
}

function formatarPercentual(valor) {
  return `${(Number(valor || 0) * 100).toFixed(2)}%`
}

function normalizarValorMonetarioInput(valor) {
  const numero = Number(String(valor || '').replace(',', '.'))
  return Number.isNaN(numero) || numero < 0 ? 0 : numero
}

function normalizarPercentualInput(valor) {
  const numero = Number(String(valor || '').replace(',', '.'))

  if (Number.isNaN(numero) || numero < 0) {
    return 0
  }

  return numero > 1 ? numero / 100 : numero
}

function calcularIndicadoresPorPreco(custo, taxa, precoFinal) {
  const custoBase = normalizarValorMonetarioInput(custo)
  const preco = normalizarValorMonetarioInput(precoFinal)
  const taxaPercentual = normalizarPercentualInput(taxa.taxa_percentual)
  const taxaFixa = normalizarValorMonetarioInput(taxa.taxa_fixa)
  const freteMedio = normalizarValorMonetarioInput(taxa.frete_medio)
  const indiceExtra = normalizarPercentualInput(taxa.indice_extra_percentual)
  const imposto = normalizarPercentualInput(taxa.imposto_percentual)
  const valorTaxa = preco * taxaPercentual
  const valorIndiceExtra = preco * indiceExtra
  const valorImposto = preco * imposto
  const lucro = preco - custoBase - freteMedio - taxaFixa - valorTaxa - valorIndiceExtra - valorImposto

  return {
    preco_sugerido: Number(preco.toFixed(2)),
    lucro_estimado: Number(lucro.toFixed(2)),
    margem_real: preco > 0 ? Number((lucro / preco).toFixed(4)) : 0,
    roi: custoBase > 0 ? Number((lucro / custoBase).toFixed(4)) : 0
  }
}

function calcularPrecoSimulado(custo, margem, taxa) {
  const custoBase = normalizarValorMonetarioInput(custo)
  const margemDesejada = normalizarPercentualInput(margem)
  const taxaPercentual = normalizarPercentualInput(taxa.taxa_percentual)
  const taxaFixa = normalizarValorMonetarioInput(taxa.taxa_fixa)
  const freteMedio = normalizarValorMonetarioInput(taxa.frete_medio)
  const indiceExtra = normalizarPercentualInput(taxa.indice_extra_percentual)
  const imposto = normalizarPercentualInput(taxa.imposto_percentual)
  const divisorMargem = 1 - taxaPercentual - indiceExtra - imposto - margemDesejada

  if (divisorMargem <= 0) {
    return {
      erro: 'Percentuais e margem somam 100% ou mais'
    }
  }

  const preco = (custoBase + freteMedio + taxaFixa) / divisorMargem
  return {
    ...calcularIndicadoresPorPreco(custoBase, taxa, preco),
    erro: ''
  }
}

function calcularPrecoMinimo(custo, taxa) {
  const custoBase = normalizarValorMonetarioInput(custo)
  const taxaPercentual = normalizarPercentualInput(taxa.taxa_percentual)
  const taxaFixa = normalizarValorMonetarioInput(taxa.taxa_fixa)
  const freteMedio = normalizarValorMonetarioInput(taxa.frete_medio)
  const indiceExtra = normalizarPercentualInput(taxa.indice_extra_percentual)
  const imposto = normalizarPercentualInput(taxa.imposto_percentual)
  const custos = custoBase + taxaFixa + freteMedio
  const taxas = taxaPercentual + imposto + indiceExtra
  const divisor = 1 - taxas

  if (divisor <= 0) {
    return {
      erro: 'Taxas somam 100% ou mais'
    }
  }

  return {
    preco_minimo: Number((custos / divisor).toFixed(2)),
    erro: ''
  }
}

function analisarPreco(preco, custo, taxaPercentual, taxaFixa, impostoPercentual, adsPercentual) {
  const precoNormalizado = Number(preco || 0)
  const custoNormalizado = Number(custo || 0)
  const taxaPercentualNormalizada = Number(taxaPercentual || 0)
  const taxaFixaNormalizada = Number(taxaFixa || 0)
  const impostoPercentualNormalizado = Number(impostoPercentual || 0)
  const adsPercentualNormalizado = Number(adsPercentual || 0)
  const tarifa = (precoNormalizado * taxaPercentualNormalizada) + taxaFixaNormalizada
  const imposto = precoNormalizado * impostoPercentualNormalizado
  const ads = precoNormalizado * adsPercentualNormalizado
  const lucro = precoNormalizado - custoNormalizado - tarifa - imposto - ads
  const margem = precoNormalizado > 0 ? lucro / precoNormalizado : 0
  const roi = custoNormalizado > 0 ? lucro / custoNormalizado : 0

  return {
    lucro: Number(lucro.toFixed(2)),
    margem: Number(margem.toFixed(4)),
    roi: Number(roi.toFixed(4))
  }
}

function obterStatusResultado(lucro, margem) {
  if (Number(lucro) < 0) {
    return '\u{1F534} Prejuizo'
  }

  if (Number(margem) < 0.2) {
    return '\u{1F7E1} Baixa margem'
  }

  return '\u{1F7E2} Saudavel'
}

function obterSugestaoResultado(lucro, margem) {
  if (Number(lucro) < 0) {
    return 'Preco inviavel, abaixo do custo real'
  }

  if (Number(margem) < 0.2) {
    return 'Margem baixa, considere aumentar preco'
  }

  return 'Preco competitivo e saudavel'
}

function obterStatusConcorrencia(precoConcorrente, precoMinimo, precoIdeal) {
  const concorrente = Number(precoConcorrente || 0)
  const minimo = Number(precoMinimo || 0)
  const ideal = Number(precoIdeal || 0)

  if (concorrente < minimo) {
    return '\u{1F534} Prejuizo garantido'
  }

  if (concorrente < ideal) {
    return '\u{1F7E1} Margem baixa'
  }

  return '\u{1F7E2} Saudavel'
}

function obterSugestaoConcorrencia(precoConcorrente, precoMinimo, precoIdeal) {
  const concorrente = Number(precoConcorrente || 0)
  const minimo = Number(precoMinimo || 0)
  const ideal = Number(precoIdeal || 0)

  if (concorrente < minimo) {
    return 'Concorrente abaixo do preco minimo viavel.'
  }

  if (concorrente < ideal) {
    return 'Da para competir, mas com margem comprimida.'
  }

  return 'Faixa saudavel para competir com rentabilidade.'
}

function limparResultados() {
  document.getElementById('sim-resultado-preco').textContent = '--'
  document.getElementById('sim-resultado-lucro').textContent = '--'
  document.getElementById('sim-resultado-margem').textContent = '--'
  document.getElementById('sim-resultado-roi').textContent = '--'
  document.getElementById('sim-resultado-minimo').textContent = '--'
  atualizarStatusResultado('--', '')
  document.querySelectorAll('.simulador-resultado-card').forEach((card) => {
    card.classList.remove('positivo', 'negativo', 'erro', 'alerta', 'ok')
  })
}

function limparComparativoConcorrencia() {
  document.getElementById('sim-analise-minimo').textContent = '--'
  document.getElementById('sim-analise-ideal').textContent = '--'
  document.getElementById('sim-analise-concorrente').textContent = '--'
}

function resetarFluxoSimulador() {
  setResultadoFeedback('')
  setAnaliseFeedback('')
  setResultadoSugestao('')
  atualizarLabelsResultado()
  limparResultados()
  limparComparativoConcorrencia()
  atualizarEtapasSimulador('simulacao')
  atualizarStep(hasProdutoSelecionado() ? 2 : 1)
}

function atualizarLabelsResultado() {
  const labels = isModoReverso()
    ? {
        preco: 'Preco analisado',
        lucro: 'Lucro estimado',
        margem: 'Margem real',
        roi: 'Taxas',
        minimo: 'Preco minimo'
      }
    : {
        preco: 'Preco sugerido',
        lucro: 'Lucro estimado',
        margem: 'Margem real',
        roi: 'ROI',
        minimo: 'Preco minimo'
      }

  document.getElementById('sim-resultado-label-preco').textContent = labels.preco
  document.getElementById('sim-resultado-label-lucro').textContent = labels.lucro
  document.getElementById('sim-resultado-label-margem').textContent = labels.margem
  document.getElementById('sim-resultado-label-roi').textContent = labels.roi
  document.getElementById('sim-resultado-label-minimo').textContent = labels.minimo
}

function aplicarClasseResultado(classe) {
  const classes = ['positivo', 'negativo', 'erro', 'alerta', 'ok']

  ;[
    'sim-resultado-card-preco',
    'sim-resultado-card-lucro',
    'sim-resultado-card-margem',
    'sim-resultado-card-roi',
    'sim-resultado-card-minimo',
    'sim-resultado-card-status'
  ].forEach((id) => {
    const card = document.getElementById(id)
    card.classList.remove(...classes)

    if (classe) {
      card.classList.add(classe)
    }
  })
}

function atualizarResultados(resultado) {
  atualizarLabelsResultado()

  const modoReverso = resultado.modo === 'reverso'
  const lucro = Number(resultado.lucro_estimado ?? resultado.lucro ?? 0)
  const margem = Number(resultado.margem_real ?? resultado.margem ?? 0)
  const roi = Number(resultado.roi ?? 0)
  const preco = Number(resultado.preco ?? resultado.preco_sugerido ?? 0)
  const taxaValor = Number(resultado.taxaValor ?? 0)
  const precoMinimo = Number(resultado.precoMinimo ?? resultado.preco_minimo ?? 0)

  document.getElementById('sim-resultado-preco').textContent = preco > 0 ? formatarMoeda(preco) : '--'
  document.getElementById('sim-resultado-lucro').textContent = formatarMoeda(lucro)
  document.getElementById('sim-resultado-margem').textContent = formatarPercentual(margem)
  document.getElementById('sim-resultado-roi').textContent = modoReverso ? formatarMoeda(taxaValor) : formatarPercentual(roi)
  document.getElementById('sim-resultado-minimo').textContent = precoMinimo > 0 ? formatarMoeda(precoMinimo) : '--'

  if (modoReverso) {
    const classeResultado = lucro <= 0 ? 'erro' : margem < 0.2 ? 'alerta' : 'ok'
    aplicarClasseResultado(classeResultado)
    return
  }

  aplicarClasseResultado(lucro >= 0 ? 'positivo' : 'negativo')
}

function isAlertaPrecoAtiva() {
  return Boolean(simuladorFeatureFlags?.alertaPreco)
}

function getResumoPrecoIdealElement() {
  const precoAtualElement = document.getElementById('simulador-produto-preco')

  if (!precoAtualElement) {
    return null
  }

  let precoIdealElement = document.getElementById('simulador-produto-preco-ideal')

  if (!precoIdealElement) {
    precoIdealElement = document.createElement('div')
    precoIdealElement.id = 'simulador-produto-preco-ideal'
    precoIdealElement.className = 'preco-ideal-label hidden'
    precoAtualElement.insertAdjacentElement('afterend', precoIdealElement)
  }

  return precoIdealElement
}

function atualizarResumoPrecoIdeal(produto) {
  const precoIdealElement = getResumoPrecoIdealElement()

  if (!precoIdealElement) {
    return
  }

  precoIdealElement.textContent = ''
  precoIdealElement.classList.add('hidden')

  if (!isAlertaPrecoAtiva() || typeof calcularPrecoIdealBase !== 'function' || !produto) {
    return
  }

  const taxa = obterTaxasAtuais()
  const custo = document.getElementById('sim-custo').value || produto.custo
  const precoAtual = Number(produto.preco_venda || 0)

  if (precoAtual <= 0) {
    return
  }

  const resultadoAtual = calcularIndicadoresPorPreco(custo, taxa, precoAtual)

  if (Number(resultadoAtual.lucro_estimado || 0) >= 0) {
    return
  }

  const precoIdeal = calcularPrecoIdealBase({
    custo: normalizarValorMonetarioInput(custo),
    taxaFixa: normalizarValorMonetarioInput(taxa.taxa_fixa),
    freteMedio: normalizarValorMonetarioInput(taxa.frete_medio),
    taxaPercentual: normalizarPercentualInput(taxa.taxa_percentual),
    impostoPercentual: normalizarPercentualInput(taxa.imposto_percentual),
    indiceExtraPercentual: normalizarPercentualInput(taxa.indice_extra_percentual)
  })

  if (!precoIdeal) {
    return
  }

  precoIdealElement.textContent = `Preco ideal: ${formatarMoeda(precoIdeal)}`
  precoIdealElement.classList.remove('hidden')
}

function atualizarResumoSelecionado(produto) {
  document.getElementById('simulador-produto-nome').textContent = produto?.nome || '--'
  document.getElementById('simulador-produto-custo').textContent = formatarMoeda(produto?.custo || 0)
  document.getElementById('simulador-produto-preco').textContent = formatarMoeda(produto?.preco_venda || 0)
  atualizarResumoPrecoIdeal(produto)
}

function obterClasseStatusVisual(status) {
  const texto = String(status || '').toLowerCase()

  if (texto.includes('prejuizo')) {
    return 'status-error'
  }

  if (texto.includes('baixa margem')) {
    return 'status-warn'
  }

  if (texto.includes('saudavel')) {
    return 'status-ok'
  }

  return ''
}

function atualizarStatusResultado(status, classe = '') {
  const statusElement = document.getElementById('sim-resultado-status')
  const classeMapeada = {
    erro: 'status-error',
    alerta: 'status-warn',
    ok: 'status-ok'
  }[classe] || classe

  statusElement.textContent = status
  statusElement.className = ['simulador-status-chip', classeMapeada].filter(Boolean).join(' ')
}

function atualizarPrecoSugerido(valor) {
  document.getElementById('sim-resultado-preco').textContent = formatarMoeda(valor)
}

function obterTaxasAtuais() {
  return {
    taxa_percentual: document.getElementById('sim-taxa-percentual').value,
    taxa_fixa: document.getElementById('sim-taxa-fixa').value,
    frete_medio: document.getElementById('sim-frete-medio').value,
    indice_extra_percentual: document.getElementById('sim-indice-extra').value,
    imposto_percentual: document.getElementById('sim-imposto').value
  }
}

function obterClasseResultadoReverso(lucro, margem) {
  if (Number(lucro) <= 0) {
    return 'erro'
  }

  if (Number(margem) < 0.2) {
    return 'alerta'
  }

  return 'ok'
}

function obterStatusReverso(lucro, margem) {
  const classe = obterClasseResultadoReverso(lucro, margem)

  if (classe === 'erro') {
    return {
      texto: 'Inviavel',
      classe
    }
  }

  if (classe === 'alerta') {
    return {
      texto: 'Margem baixa',
      classe
    }
  }

  return {
    texto: 'Viavel',
    classe
  }
}

function calcularPrecoReverso(produto, precoConcorrente) {
  const taxa = obterTaxasAtuais()
  const custo = document.getElementById('sim-custo').value || produto?.custo || 0
  const preco = normalizarValorMonetarioInput(precoConcorrente)
  const custoBase = normalizarValorMonetarioInput(custo)
  const taxaPercentual = normalizarPercentualInput(taxa.taxa_percentual)
  const taxaFixa = normalizarValorMonetarioInput(taxa.taxa_fixa)
  const freteMedio = normalizarValorMonetarioInput(taxa.frete_medio)
  const indiceExtra = normalizarPercentualInput(taxa.indice_extra_percentual)
  const imposto = normalizarPercentualInput(taxa.imposto_percentual)

  if (preco <= 0) {
    return {
      erro: 'Informe um preco valido para analisar.'
    }
  }

  const taxaValorPercentual = preco * taxaPercentual
  const valorIndiceExtra = preco * indiceExtra
  const valorImposto = preco * imposto
  const taxaValor = taxaValorPercentual + taxaFixa + freteMedio + valorIndiceExtra + valorImposto
  const lucro = preco - custoBase - taxaValor
  const margem = preco > 0 ? lucro / preco : 0
  const precoMinimo = calcularPrecoMinimo(custoBase, taxa)

  if (precoMinimo.erro) {
    return precoMinimo
  }

  return {
    modo: 'reverso',
    preco: Number(preco.toFixed(2)),
    lucro: Number(lucro.toFixed(2)),
    margem: Number(margem.toFixed(4)),
    taxaValor: Number(taxaValor.toFixed(2)),
    precoMinimo: Number(precoMinimo.preco_minimo.toFixed(2)),
    roi: custoBase > 0 ? Number((lucro / custoBase).toFixed(4)) : 0,
    erro: ''
  }
}

function atualizarPainelConcorrencia() {
  if (!validarProdutoSelecionado()) {
    limparComparativoConcorrencia()
    return {
      minimo: { erro: 'Selecione um produto para comecar' },
      ideal: { erro: 'Selecione um produto para comecar' }
    }
  }

  const produto = getProdutoSelecionado()
  const taxa = obterTaxasAtuais()
  const custo = document.getElementById('sim-custo').value
  const margem = document.getElementById('sim-margem').value
  const precoConcorrenteRaw = getInputPrecoConcorrenteComparativo()?.value || ''
  const minimo = calcularPrecoMinimo(custo, taxa)
  const ideal = calcularPrecoSimulado(custo, margem, taxa)

  atualizarResumoPrecoIdeal(produto)

  if (minimo.erro || ideal.erro) {
    limparComparativoConcorrencia()
    if (ideal.erro) {
      document.getElementById('sim-analise-ideal').textContent = ideal.erro
    }
    if (minimo.erro) {
      document.getElementById('sim-analise-minimo').textContent = minimo.erro
    }
    return { minimo, ideal }
  }

  document.getElementById('sim-analise-minimo').textContent = formatarMoeda(minimo.preco_minimo)
  document.getElementById('sim-analise-ideal').textContent = formatarMoeda(ideal.preco_sugerido)

  if (precoConcorrenteRaw && Number(precoConcorrenteRaw) > 0) {
    document.getElementById('sim-analise-concorrente').textContent = formatarMoeda(precoConcorrenteRaw)
  } else {
    document.getElementById('sim-analise-concorrente').textContent = '--'
  }

  return { minimo, ideal }
}

function getProdutoSelecionado() {
  return simuladorProdutosCache.find((produto) => Number(produto.id) === Number(simuladorProdutoSelecionadoId)) || null
}

function criarPaginacao(totalPages) {
  const paginacao = document.getElementById('simulador-paginacao')
  paginacao.innerHTML = ''

  for (let pagina = 1; pagina <= totalPages; pagina += 1) {
    paginacao.innerHTML += `<button type="button" onclick="irParaPaginaSimulador(${pagina})">${pagina}</button>`
  }
}

window.irParaPaginaSimulador = function irParaPaginaSimulador(pagina) {
  simuladorPaginaAtual = pagina
  carregarProdutosSimulador()
}

window.selecionarProdutoSimulador = function selecionarProdutoSimulador(produtoId) {
  simuladorProdutoSelecionadoId = Number(produtoId)
  document.querySelectorAll('[data-sim-produto-id]').forEach((row) => {
    row.classList.toggle('row-selected', Number(row.dataset.simProdutoId) === simuladorProdutoSelecionadoId)
  })
  habilitarCamposSimulador()
  renderResumoProduto()
  animateLiberado(document.getElementById('simulador-conteudo'))
  animateLiberado(document.getElementById('simulador-cenario-card'))
  atualizarStep(2)
  setSimuladorFeedback(
    isModoReverso() ? 'Informe o preco do concorrente para analisar a viabilidade.' : 'Ajuste os campos para calcular a simulacao.',
    'text-success'
  )
}

function atualizarModoSimulador(modo) {
  simuladorModoAtual = modo === 'reverso' ? 'reverso' : 'ideal'

  const botaoIdeal = document.getElementById('simulador-modo-ideal')
  const botaoReverso = document.getElementById('simulador-modo-reverso')
  const campoMargem = document.getElementById('simulador-field-margem')
  const campoPrecoConcorrente = document.getElementById('simulador-field-preco-concorrente')
  const botaoPrincipal = document.getElementById('simulador-calcular-button')

  if (botaoIdeal) {
    botaoIdeal.className = simuladorModoAtual === 'ideal' ? 'button-primary' : 'button-secondary'
    botaoIdeal.setAttribute('aria-pressed', String(simuladorModoAtual === 'ideal'))
  }

  if (botaoReverso) {
    botaoReverso.className = simuladorModoAtual === 'reverso' ? 'button-primary' : 'button-secondary'
    botaoReverso.setAttribute('aria-pressed', String(simuladorModoAtual === 'reverso'))
  }

  campoMargem?.classList.toggle('hidden', isModoReverso())
  campoPrecoConcorrente?.classList.toggle('hidden', !isModoReverso())

  if (botaoPrincipal) {
    botaoPrincipal.textContent = isModoReverso() ? 'Analisar preco' : 'Calcular simulacao'
  }

  atualizarLabelsResultado()
  resetarFluxoSimulador()

  if (hasProdutoSelecionado()) {
    setSimuladorFeedback(
      isModoReverso()
        ? 'Informe o preco do concorrente para analisar a viabilidade.'
        : 'Ajuste os campos para calcular a simulacao.',
      'text-success'
    )
  }
}

function preencherSelectMarketplaces(produto) {
  const select = getMarketplaceSelect()
  const marketplaces = Array.isArray(produto?.marketplaces) ? produto.marketplaces : []

  if (!marketplaces.length) {
    select.innerHTML = '<option value="">Sem marketplaces</option>'
    return
  }

  select.innerHTML = '<option value="">Selecione</option>'

  marketplaces.forEach((marketplace) => {
    const option = document.createElement('option')
    option.value = marketplace.id
    option.textContent = marketplace.nome
    select.appendChild(option)
  })

  if (marketplaces[0]?.id != null) {
    select.value = String(marketplaces[0].id)
  }
}

function preencherCamposCenario() {
  const produto = getProdutoSelecionado()
  const marketplaceId = Number(getMarketplaceSelect()?.value)
  const marketplace = (produto?.marketplaces || []).find((item) => Number(item.id) === marketplaceId)

  if (!produto || !marketplace) {
    return
  }

  document.getElementById('sim-custo').value = produto.custo || 0
  document.getElementById('sim-margem').value = marketplace.margem || produto.margem_desejada || 0
  document.getElementById('sim-taxa-percentual').value = marketplace.taxa_percentual || 0
  document.getElementById('sim-taxa-fixa').value = marketplace.taxa_fixa || 0
  document.getElementById('sim-frete-medio').value = marketplace.frete_medio || 0
  document.getElementById('sim-indice-extra').value = marketplace.indice_extra_percentual || 0
  document.getElementById('sim-imposto').value = marketplace.imposto_percentual || 0
}

function renderResumoProduto() {
  const produto = getProdutoSelecionado()
  const titulo = document.getElementById('simulador-produto-titulo')
  const resumo = document.getElementById('simulador-produto-resumo')
  const vazio = document.getElementById('simulador-vazio')
  const conteudo = document.getElementById('simulador-conteudo')
  const tabela = document.getElementById('simulador-marketplaces-tabela')
  const cardCenario = document.getElementById('simulador-cenario-card')

  if (!produto) {
    titulo.textContent = 'Selecione um produto'
    resumo.textContent = 'A simulacao usa o mesmo conjunto de taxas e margens ja configurado para o produto.'
    vazio.classList.remove('hidden')
    conteudo.classList.add('hidden')
    cardCenario.classList.add('hidden')
    tabela.innerHTML = ''
    atualizarResumoSelecionado(null)
    resetarFluxoSimulador()
    bloquearCamposSimulador()
    atualizarStep(1)
    setSimuladorFeedback('Selecione um produto para comecar')
    return
  }

  titulo.textContent = produto.nome
  resumo.textContent = `Custo ${formatarMoeda(produto.custo)} | Preco direto ${formatarMoeda(produto.preco_venda)}`
  atualizarResumoSelecionado(produto)
  vazio.classList.add('hidden')
  conteudo.classList.remove('hidden')
  cardCenario.classList.remove('hidden')
  atualizarEtapasSimulador('simulacao')
  atualizarStep(2)

  if (!Array.isArray(produto.marketplaces) || !produto.marketplaces.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4"><span class="text-soft">Esse produto ainda nao possui marketplaces vinculados.</span></td>
      </tr>
    `
    getMarketplaceSelect().innerHTML = '<option value="">Sem marketplaces</option>'
    resetarFluxoSimulador()
    atualizarEtapasSimulador('simulacao')
    atualizarStep(2)
    return
  }

  tabela.innerHTML = produto.marketplaces
    .map((marketplace) => {
      const status = marketplace.status_label || (marketplace.taxa_configurada ? 'Calculado' : 'Sem taxa')

      return `
        <tr>
          <td>${marketplace.nome}</td>
          <td>${formatarMoeda(marketplace.preco_calculado)}</td>
          <td>${formatarPercentual(marketplace.margem_real || marketplace.margem || 0)}</td>
          <td>${status}</td>
        </tr>
      `
    })
    .join('')

  preencherSelectMarketplaces(produto)
  preencherCamposCenario()
  resetarFluxoSimulador()
  atualizarPainelConcorrencia()
}

async function carregarProdutosSimulador() {
  try {
    const dados = await apiFetch(
      `/produtos?page=${simuladorPaginaAtual}&busca=${encodeURIComponent(simuladorBuscaAtual)}`
    )

    if (hasProdutoSelecionado()) {
      setSimuladorFeedback('')
    } else {
      setSimuladorFeedback('Selecione um produto para comecar')
    }
    simuladorProdutosCache = Array.isArray(dados.produtos) ? dados.produtos : []
    const tabela = document.getElementById('simulador-produtos-tabela')

    if (!simuladorProdutosCache.length) {
      tabela.innerHTML = `
        <tr>
          <td colspan="4">Nenhum produto encontrado.</td>
        </tr>
      `
      criarPaginacao(dados.totalPages || 1)
      renderResumoProduto()
      return
    }

    tabela.innerHTML = simuladorProdutosCache
      .map((produto) => {
        const marketplaces = Array.isArray(produto.marketplaces) ? produto.marketplaces.length : 0
        const rowClass = Number(produto.id) === Number(simuladorProdutoSelecionadoId) ? 'row-selected' : ''

        return `
          <tr class="${rowClass}" data-sim-produto-id="${produto.id}" onclick="selecionarProdutoSimulador(${produto.id})">
            <td>${produto.nome}</td>
            <td>${formatarMoeda(produto.custo)}</td>
            <td>${formatarMoeda(produto.preco_venda)}</td>
            <td>${marketplaces}</td>
          </tr>
        `
      })
      .join('')

    if (
      simuladorProdutoSelecionadoId &&
      !simuladorProdutosCache.some((produto) => Number(produto.id) === Number(simuladorProdutoSelecionadoId))
    ) {
      simuladorProdutoSelecionadoId = null
      bloquearCamposSimulador()
      atualizarStep(1)
      setSimuladorFeedback('Selecione um produto para comecar')
    }

    criarPaginacao(dados.totalPages || 1)
    renderResumoProduto()
  } catch (error) {
    setSimuladorFeedback(error.message, 'text-danger')
  }
}

function calcularCenario() {
  if (!validarProdutoSelecionado()) {
    return
  }

  const marketplaceId = Number(getMarketplaceSelect()?.value)
  const produto = getProdutoSelecionado()
  const marketplace = (produto?.marketplaces || []).find((item) => Number(item.id) === marketplaceId)

  if (!produto || !marketplace) {
    setSimuladorFeedback('Selecione um produto valido para calcular a simulacao', 'text-danger')
    setResultadoFeedback('Selecione um produto e marketplace para continuar.', 'text-danger')
    return
  }

  const taxa = {
    ...obterTaxasAtuais()
  }

  const resultado = calcularPrecoSimulado(
    document.getElementById('sim-custo').value,
    document.getElementById('sim-margem').value,
    taxa
  )

  if (resultado.erro) {
    document.getElementById('sim-resultado-preco').textContent = '--'
    setResultadoFeedback(resultado.erro, 'text-danger')
    setSimuladorFeedback(resultado.erro, 'text-danger')
    return
  }

  const minimo = calcularPrecoMinimo(document.getElementById('sim-custo').value, taxa)

  if (minimo.erro) {
    setResultadoFeedback(minimo.erro, 'text-danger')
    setSimuladorFeedback(minimo.erro, 'text-danger')
    return
  }

  atualizarPainelConcorrencia()
  atualizarResultados({
    ...resultado,
    preco: resultado.preco_sugerido,
    precoMinimo: minimo.preco_minimo
  })
  const status = obterStatusResultado(resultado.lucro_estimado, resultado.margem_real)
  atualizarStatusResultado(status, obterClasseStatusVisual(status))
  setResultadoSugestao(obterSugestaoResultado(resultado.lucro_estimado, resultado.margem_real))
  setResultadoFeedback('Simulacao calculada sem alterar os dados reais do produto.', 'text-success')
  setSimuladorFeedback('Revise o preco ideal e compare com a concorrencia, se desejar.', 'text-success')
  atualizarEtapasSimulador('resultado')
  atualizarStep(3)
  animateLiberado(document.getElementById('simulador-etapa-resultado'))
}

function analisarPrecoInformado() {
  if (!validarProdutoSelecionado()) {
    setAnaliseFeedback('Selecione um produto antes de analisar o preco.', 'text-danger')
    return
  }

  const marketplaceId = Number(getMarketplaceSelect()?.value)
  const produto = getProdutoSelecionado()
  const marketplace = (produto?.marketplaces || []).find((item) => Number(item.id) === marketplaceId)

  if (!produto || !marketplace) {
    setSimuladorFeedback('Selecione um produto valido para analisar o preco', 'text-danger')
    setAnaliseFeedback('Selecione um produto e marketplace para analisar o preco.', 'text-danger')
    return
  }

  const preco = parseFloat(getInputPrecoConcorrenteComparativo()?.value)

  if (!preco || preco <= 0) {
    setSimuladorFeedback('Informe o preco do concorrente para continuar', 'text-danger')
    setAnaliseFeedback('Informe um preco valido.', 'text-danger')
    return
  }

  const comparativo = atualizarPainelConcorrencia()

  if (comparativo.minimo.erro || comparativo.ideal.erro) {
    setAnaliseFeedback(comparativo.minimo.erro || comparativo.ideal.erro, 'text-danger')
    return
  }

  const resultado = calcularPrecoReverso(produto, preco)

  if (resultado.erro) {
    setAnaliseFeedback(resultado.erro, 'text-danger')
    return
  }

  atualizarResultados(resultado)
  const status = obterStatusReverso(resultado.lucro, resultado.margem)
  atualizarStatusResultado(status.texto, status.classe)
  setResultadoSugestao(
    obterSugestaoConcorrencia(preco, comparativo.minimo.preco_minimo, comparativo.ideal.preco_sugerido)
  )
  setAnaliseFeedback('Preco analisado sem alterar o preco sugerido.', 'text-success')
  setSimuladorFeedback('Analise se o preco e lucrativo', 'text-success')
  atualizarEtapasSimulador('resultado')
  atualizarStep(3)
  animateLiberado(document.getElementById('simulador-etapa-resultado'))
}

function analisarPrecoPrincipal() {
  if (!validarProdutoSelecionado()) {
    return
  }

  const marketplaceId = Number(getMarketplaceSelect()?.value)
  const produto = getProdutoSelecionado()
  const marketplace = (produto?.marketplaces || []).find((item) => Number(item.id) === marketplaceId)
  const precoConcorrente = parseFloat(getInputPrecoConcorrentePrincipal()?.value)

  if (!produto || !marketplace) {
    setSimuladorFeedback('Selecione um produto e marketplace para continuar.', 'text-danger')
    setResultadoFeedback('Selecione um produto e marketplace para analisar o preco.', 'text-danger')
    return
  }

  if (!precoConcorrente || precoConcorrente <= 0) {
    setSimuladorFeedback('Informe o preco do concorrente para continuar.', 'text-danger')
    setResultadoFeedback('Digite um preco do concorrente valido para analisar.', 'text-danger')
    return
  }

  const resultado = calcularPrecoReverso(produto, precoConcorrente)

  if (resultado.erro) {
    setSimuladorFeedback(resultado.erro, 'text-danger')
    setResultadoFeedback(resultado.erro, 'text-danger')
    return
  }

  atualizarResultados(resultado)
  const status = obterStatusReverso(resultado.lucro, resultado.margem)
  atualizarStatusResultado(status.texto, status.classe)
  setResultadoSugestao(
    resultado.lucro <= 0
      ? 'Esse preco nao cobre os custos atuais da operacao.'
      : resultado.margem < 0.2
        ? 'O preco e viavel, mas a margem esta comprimida.'
        : 'O preco analisado sustenta uma margem saudavel.'
  )
  setResultadoFeedback('Preco analisado sem alterar os dados reais do produto.', 'text-success')
  setSimuladorFeedback('Analise concluida com base no preco informado.', 'text-success')
  atualizarEtapasSimulador('resultado')
  atualizarStep(3)
  animateLiberado(document.getElementById('simulador-etapa-resultado'))
}

function executarAcaoPrincipal() {
  if (isModoReverso()) {
    analisarPrecoPrincipal()
    return
  }

  calcularCenario()
}

function inicializarSimuladorPreco() {
  document.getElementById('simulador-busca-produto').addEventListener('input', function () {
    const valor = this.value.trim()

    if (simuladorBuscaTimer) {
      clearTimeout(simuladorBuscaTimer)
    }

    simuladorBuscaTimer = window.setTimeout(() => {
      simuladorBuscaAtual = valor
      simuladorPaginaAtual = 1
      carregarProdutosSimulador()
    }, 250)
  })

  document.getElementById('simulador-atualizar-button').addEventListener('click', carregarProdutosSimulador)
  document.getElementById('simulador-modo-ideal').addEventListener('click', () => {
    atualizarModoSimulador('ideal')
  })
  document.getElementById('simulador-modo-reverso').addEventListener('click', () => {
    atualizarModoSimulador('reverso')
  })
  getMarketplaceSelect().addEventListener('change', () => {
    if (!validarProdutoSelecionado()) {
      return
    }

    preencherCamposCenario()
    resetarFluxoSimulador()
    atualizarPainelConcorrencia()
  })
  document.getElementById('simulador-calcular-button').addEventListener('click', executarAcaoPrincipal)
  document.getElementById('simulador-analisar-button').addEventListener('click', analisarPrecoInformado)

  ;[
    'sim-custo',
    'sim-margem',
    'sim-taxa-percentual',
    'sim-taxa-fixa',
    'sim-frete-medio',
    'sim-indice-extra',
    'sim-imposto',
    'precoConcorrente',
    'precoConcorrenteComparativo'
  ].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      if (id === 'precoConcorrente' || id === 'precoConcorrenteComparativo') {
        sincronizarPrecoConcorrente(document.getElementById(id).value, id)
      }

      if (!hasProdutoSelecionado()) {
        return
      }

      atualizarPainelConcorrencia()
    })
  })

  bloquearCamposSimulador()
  atualizarModoSimulador('ideal')
  atualizarStep(1)
  setSimuladorFeedback('Selecione um produto para comecar')
  void carregarMarketplaces()
  void carregarProdutosSimulador()
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarSimuladorPreco()
})
